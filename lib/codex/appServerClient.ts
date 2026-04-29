import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { createInterface } from "node:readline";
import { observeCodexRunWithOpenAI } from "@/lib/observer/openaiGraphObserver";
import type { GraphEvent } from "@/lib/types/observedGraph";

type JsonRpcMessage = {
  id?: number;
  method?: string;
  params?: Record<string, unknown>;
  result?: unknown;
  error?: {
    code?: number;
    message?: string;
  };
};

export type CodexAppServerRunInput = {
  repoPath: string;
  prompt: string;
  model?: string;
};

export type CodexAppServerRunResult = {
  threadId?: string;
  turnId?: string;
  assistantText: string;
  rawEvents: JsonRpcMessage[];
  graphEvents: GraphEvent[];
  adapterGraphEvents: GraphEvent[];
  observerGraphEvents: GraphEvent[];
  observerError?: string;
};

type PendingRequest = {
  resolve: (message: JsonRpcMessage) => void;
  reject: (error: Error) => void;
};

function safeId(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
}

function promptTitle(prompt: string) {
  const clean = prompt.replace(/\s+/g, " ").trim();

  if (!clean) {
    return "Codex Task";
  }

  return clean.length > 52 ? `${clean.slice(0, 52)}...` : clean;
}

function itemSummary(item: Record<string, unknown>) {
  if (typeof item.text === "string") {
    return item.text;
  }

  if (typeof item.command === "string") {
    return item.command;
  }

  if (typeof item.path === "string") {
    return item.path;
  }

  if (typeof item.type === "string") {
    return item.type;
  }

  return "Codex event";
}

function fileChangePaths(item: Record<string, unknown>) {
  const changes = item.changes;

  if (!Array.isArray(changes)) {
    return [];
  }

  return changes
    .map((change) => {
      if (!change || typeof change !== "object") {
        return undefined;
      }

      const record = change as Record<string, unknown>;
      return typeof record.path === "string" ? record.path : undefined;
    })
    .filter((path): path is string => Boolean(path));
}

function graphEventsFromNotification(
  runId: string,
  message: JsonRpcMessage,
): GraphEvent[] {
  if (message.method === "turn/plan/updated") {
    return [
      {
        type: "evidence.add",
        targetId: runId,
        evidence: {
          id: `${runId}_plan_updated`,
          kind: "plan",
          summary: "Codex updated the implementation plan.",
        },
      },
    ];
  }

  if (message.method === "turn/diff/updated") {
    return [
      {
        type: "evidence.add",
        targetId: runId,
        evidence: {
          id: `${runId}_diff_updated`,
          kind: "diff",
          summary: "Codex produced a working diff.",
        },
      },
    ];
  }

  if (message.method === "turn/completed") {
    const turn = message.params?.turn;
    const status =
      turn && typeof turn === "object"
        ? (turn as Record<string, unknown>).status
        : undefined;

    return [
      {
        type: "status.update",
        targetId: runId,
        status: status === "failed" ? "risk" : "implemented",
        summary:
          status === "failed"
            ? "Codex turn failed or was interrupted."
            : "Codex completed the requested turn.",
      },
    ];
  }

  if (message.method !== "item/completed" && message.method !== "item/started") {
    return [];
  }

  const item = message.params?.item;

  if (!item || typeof item !== "object") {
    return [];
  }

  const record = item as Record<string, unknown>;

  if (record.type === "commandExecution") {
    const command = typeof record.command === "string" ? record.command : "command";
    const status = typeof record.status === "string" ? record.status : undefined;

    if (message.method === "item/started") {
      return [
        {
          type: "evidence.add",
          targetId: runId,
          evidence: {
            id: `${runId}_command_started_${safeId(command)}`,
            kind: "command",
            summary: `Codex started command: ${command}`,
          },
        },
      ];
    }

    if (status === "failed") {
      return [
        {
          type: "risk.add",
          targetId: runId,
          risk: {
            id: `${runId}_command_failed_${safeId(command)}`,
            severity: "high",
            summary: `Command failed: ${command}`,
          },
        },
      ];
    }

    return [
      {
        type: "evidence.add",
        targetId: runId,
        evidence: {
          id: `${runId}_command_completed_${safeId(command)}`,
          kind: "command",
          summary: `Command completed: ${command}`,
        },
      },
    ];
  }

  if (record.type === "fileChange") {
    return fileChangePaths(record).map((path) => ({
      type: "evidence.add",
      targetId: runId,
      evidence: {
        id: `${runId}_file_${safeId(path)}`,
        kind: "diff",
        summary: `Codex changed ${path}`,
        path,
      },
    }));
  }

  if (record.type === "agentMessage" && typeof record.text === "string") {
    return [
      {
        type: "evidence.add",
        targetId: runId,
        evidence: {
          id: `${runId}_agent_message_${safeId(record.text).slice(0, 32)}`,
          kind: "inference",
          summary: itemSummary(record),
        },
      },
    ];
  }

  return [];
}

export class CodexAppServerClient {
  private readonly proc: ChildProcessWithoutNullStreams;
  private readonly pending = new Map<number, PendingRequest>();
  private readonly rawEvents: JsonRpcMessage[] = [];
  private nextId = 1;

  constructor(private readonly timeoutMs: number) {
    this.proc = spawn(process.env.CODEX_BINARY || "codex", ["app-server"], {
      stdio: ["pipe", "pipe", "pipe"],
      env: process.env,
    });
  }

  async run(input: CodexAppServerRunInput): Promise<CodexAppServerRunResult> {
    const graphEvents: GraphEvent[] = [];
    const runId = `codex_run_${Date.now()}`;
    const model = input.model || process.env.CODEX_APP_SERVER_MODEL || "gpt-5.4";
    let threadId: string | undefined;
    let turnId: string | undefined;
    let assistantText = "";
    let completed = false;

    graphEvents.push({
      type: "node.upsert",
      node: {
        id: runId,
        nodeType: "feature",
        title: promptTitle(input.prompt),
        status: "building",
        summary: `Codex is working in ${input.repoPath}.`,
      },
    });

    const cleanup = this.listen((message) => {
      this.rawEvents.push(message);

      if (message.method) {
        graphEvents.push(...graphEventsFromNotification(runId, message));
      }

      if (message.method === "item/agentMessage/delta") {
        const delta = message.params?.delta;

        if (typeof delta === "string") {
          assistantText += delta;
        }
      }

      if (message.method === "item/completed") {
        const item = message.params?.item;

        if (item && typeof item === "object") {
          const record = item as Record<string, unknown>;

          if (record.type === "agentMessage" && typeof record.text === "string") {
            assistantText = record.text;
          }
        }
      }

      if (message.method === "turn/started") {
        const turn = message.params?.turn;

        if (turn && typeof turn === "object") {
          const id = (turn as Record<string, unknown>).id;

          if (typeof id === "string") {
            turnId = id;
          }
        }
      }

      if (message.method === "turn/completed") {
        completed = true;
      }
    });

    try {
      await this.request("initialize", {
        clientInfo: {
          name: "cocanvas",
          title: "cocanvas",
          version: "0.1.0",
        },
        capabilities: {
          experimentalApi: true,
        },
      });
      this.notify("initialized", {});

      const apiKey = process.env.OPENAI_API_KEY;

      if (apiKey) {
        await this.request("account/login/start", {
          type: "apiKey",
          apiKey,
        });
      }

      const threadResponse = await this.request("thread/start", {
        model,
        cwd: input.repoPath,
        experimentalRawEvents: true,
        persistExtendedHistory: true,
      });
      threadId = this.readThreadId(threadResponse);

      if (!threadId) {
        throw new Error("Codex App Server did not return a thread id.");
      }

      await this.request("turn/start", {
        threadId,
        cwd: input.repoPath,
        input: [{ type: "text", text: input.prompt, text_elements: [] }],
      });

      await this.waitForCompletion(() => completed);

      const adapterGraphEvents = [...graphEvents];
      let observerGraphEvents: GraphEvent[] = [];
      let observerError: string | undefined;

      try {
        observerGraphEvents = await observeCodexRunWithOpenAI({
          repoPath: input.repoPath,
          prompt: input.prompt,
          runId,
          assistantText,
          rawEvents: this.rawEvents,
          adapterGraphEvents,
        });
      } catch (error) {
        observerError =
          error instanceof Error ? error.message : "OpenAI observer failed.";
      }

      return {
        threadId,
        turnId,
        assistantText,
        rawEvents: this.rawEvents,
        graphEvents:
          observerGraphEvents.length > 0 ? observerGraphEvents : adapterGraphEvents,
        adapterGraphEvents,
        observerGraphEvents,
        observerError,
      };
    } finally {
      cleanup();
      this.proc.kill();
    }
  }

  private listen(onNotification: (message: JsonRpcMessage) => void) {
    const stdout = createInterface({ input: this.proc.stdout });
    let stderr = "";

    this.proc.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    this.proc.once("exit", (code) => {
      const error = new Error(
        `Codex App Server exited with code ${code ?? "unknown"}.${
          stderr ? ` ${stderr.trim()}` : ""
        }`,
      );

      this.pending.forEach((request) => request.reject(error));
      this.pending.clear();
    });

    stdout.on("line", (line) => {
      const message = JSON.parse(line) as JsonRpcMessage;

      if (typeof message.id === "number") {
        const pending = this.pending.get(message.id);

        if (pending) {
          this.pending.delete(message.id);

          if (message.error) {
            pending.reject(new Error(message.error.message || "Codex request failed."));
          } else {
            pending.resolve(message);
          }
        }
      } else {
        onNotification(message);
      }
    });

    return () => stdout.close();
  }

  private request(method: string, params?: unknown) {
    const id = this.nextId;
    this.nextId += 1;

    const payload = params === undefined ? { method, id } : { method, id, params };

    return new Promise<JsonRpcMessage>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Timed out waiting for ${method}.`));
      }, this.timeoutMs);

      this.pending.set(id, {
        resolve: (message) => {
          clearTimeout(timeout);
          resolve(message);
        },
        reject: (error) => {
          clearTimeout(timeout);
          reject(error);
        },
      });
      this.proc.stdin.write(`${JSON.stringify(payload)}\n`);
    });
  }

  private notify(method: string, params: unknown) {
    this.proc.stdin.write(`${JSON.stringify({ method, params })}\n`);
  }

  private readThreadId(message: JsonRpcMessage) {
    const result = message.result;

    if (!result || typeof result !== "object") {
      return undefined;
    }

    const thread = (result as Record<string, unknown>).thread;

    if (!thread || typeof thread !== "object") {
      return undefined;
    }

    const id = (thread as Record<string, unknown>).id;

    return typeof id === "string" ? id : undefined;
  }

  private waitForCompletion(isCompleted: () => boolean) {
    const startedAt = Date.now();

    return new Promise<void>((resolve, reject) => {
      const interval = setInterval(() => {
        if (isCompleted()) {
          clearInterval(interval);
          resolve();
          return;
        }

        if (Date.now() - startedAt > this.timeoutMs) {
          clearInterval(interval);
          reject(new Error("Timed out waiting for Codex turn to complete."));
        }
      }, 250);
    });
  }
}
