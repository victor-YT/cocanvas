"use client";

import { useEffect, useState } from "react";
import { mockGraphEvents } from "@/lib/demo/mockGraphEvents";
import { useGraphStore } from "@/lib/state/graphStore";
import type { GraphEvent } from "@/lib/types/observedGraph";
import { FeatureCanvas } from "@/components/graph/FeatureCanvas";
import {
  CodexChatPanel,
  type CodexFunctionId,
  type CodexRunOptions,
} from "@/components/codex/CodexChatPanel";
import {
  CodexRunStatusBar,
  type CodexRunStatus,
} from "@/components/codex/CodexRunStatusBar";

const nodeReplayDelayMs = 1000;
const updateReplayDelayMs = 180;

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function replayDelayForEvent(event: (typeof mockGraphEvents)[number]) {
  if (
    event.type === "node.upsert" ||
    event.type === "evidence.add" ||
    event.type === "risk.add"
  ) {
    return nodeReplayDelayMs;
  }

  return updateReplayDelayMs;
}

const functionPrompts: Record<CodexFunctionId, string> = {
  plan: "Plan the next implementation steps.",
  implement: "Implement this feature end-to-end.",
  edit: "Edit the files needed for this feature only.",
  test: "Generate and run the relevant tests.",
  fix: "Fix the latest failing or risky behavior.",
  review: "Review the graph evidence and summarize risk.",
  explain: "Explain this feature in product language.",
  scope: "Check whether the work stayed inside the current run scope.",
};

const quickActionPhase: Partial<
  Record<CodexFunctionId, { status: CodexRunStatus; phase: string; message: string }>
> = {
  plan: {
    status: "working",
    phase: "Planning",
    message: "Asking Codex for the next implementation plan.",
  },
  test: {
    status: "testing",
    phase: "Running tests",
    message: "Asking Codex to generate and run the relevant tests.",
  },
  review: {
    status: "working",
    phase: "Reviewing changes",
    message: "Asking Codex to inspect evidence and risk.",
  },
};

function formatElapsed(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes === 0) {
    return `${seconds}s`;
  }

  return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
}

function replayStatusForEvent(event: (typeof mockGraphEvents)[number]) {
  if (event.type === "node.upsert") {
    return {
      phase: "Observing features",
      message: `Added ${event.node.title}.`,
    };
  }

  if (event.type === "edge.upsert") {
    return {
      phase: "Linking hierarchy",
      message: "Connected parent and child features.",
    };
  }

  if (event.type === "evidence.add") {
    return {
      phase: "Attaching evidence",
      message: event.evidence.summary,
    };
  }

  if (event.type === "risk.add") {
    return {
      phase: "Tracking risk",
      message: event.risk.summary,
    };
  }

  return {
    phase: "Updating status",
    message: event.summary ?? "Updated the feature map.",
  };
}

export function AppShell() {
  const {
    graph,
    selectNode,
    applyGraphEvent,
    resetCanvas,
  } = useGraphStore([]);
  const [isReplaying, setIsReplaying] = useState(false);
  const [isCodexRunning, setIsCodexRunning] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [repoPath, setRepoPath] = useState("Loading repo...");
  const [chatDraft, setChatDraft] = useState("");
  const [runStatus, setRunStatus] = useState<CodexRunStatus>("idle");
  const [runPhase, setRunPhase] = useState("Ready");
  const [runMessage, setRunMessage] = useState("Choose a repo, then ask Codex what to build.");
  const [runStartedAt, setRunStartedAt] = useState<number>();
  const [elapsed, setElapsed] = useState("0s");

  const selectedNode = graph.nodes.find(
    (node) => node.id === graph.selectedNodeId,
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setMounted(true), 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    async function loadCurrentRepo() {
      const response = await fetch("/api/repo/current");
      const data = (await response.json()) as { repoPath?: string };

      if (data.repoPath) {
        setRepoPath(data.repoPath);
      }
    }

    void loadCurrentRepo();
  }, []);

  useEffect(() => {
    if (!runStartedAt || (runStatus !== "working" && runStatus !== "testing")) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setElapsed(formatElapsed(Date.now() - runStartedAt));
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [runStartedAt, runStatus]);

  async function runDemoReplay() {
    setIsReplaying(true);
    setRunStatus("working");
    setRunPhase("Demo replay");
    setRunMessage("Appending observed feature events.");
    setRunStartedAt(Date.now());
    setElapsed("0s");
    resetCanvas();

    for (const event of mockGraphEvents) {
      await wait(replayDelayForEvent(event));
      const nextStatus = replayStatusForEvent(event);
      setRunPhase(nextStatus.phase);
      setRunMessage(nextStatus.message);
      applyGraphEvent(event);
    }

    setIsReplaying(false);
    setRunStatus("completed");
    setRunPhase("Completed");
    setRunMessage(`${mockGraphEvents.length} graph events applied.`);
    setRunStartedAt(undefined);
  }

  function handleResetCanvas() {
    resetCanvas();
    setRunStatus("idle");
    setRunPhase("Ready");
    setRunMessage("Choose a repo, then ask Codex what to build.");
    setRunStartedAt(undefined);
  }

  function modelForCodex(options: CodexRunOptions) {
    return options.model === "auto" ? undefined : options.model;
  }

  async function startCodexTask(
    prompt: string,
    options: CodexRunOptions,
    runIntent?: {
      status?: CodexRunStatus;
      phase?: string;
      message?: string;
    },
  ) {
    if (!prompt) {
      return;
    }

    setIsCodexRunning(true);
    setRunStatus(runIntent?.status ?? "working");
    setRunPhase(runIntent?.phase ?? "Working");
    setRunMessage(runIntent?.message ?? "Sending the task to Codex App Server.");
    setRunStartedAt(Date.now());
    setElapsed("0s");
    setChatDraft("");

    try {
      const response = await fetch("/api/codex/start", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          repoPath,
          prompt,
          model: modelForCodex(options),
        }),
      });
      const data = (await response.json()) as {
        assistantText?: string;
        graphEvents?: GraphEvent[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Codex task failed.");
      }

      data.graphEvents?.forEach((event) => applyGraphEvent(event));
      setRunStatus("completed");
      setRunPhase("Completed");
      setRunMessage(`${data.graphEvents?.length ?? 0} graph events applied.`);
    } catch (error) {
      setRunStatus("failed");
      setRunPhase("Needs attention");
      setRunMessage(error instanceof Error ? error.message : "Codex task failed.");
    } finally {
      setIsCodexRunning(false);
      setRunStartedAt(undefined);
    }
  }

  function submitCodexChat(options: CodexRunOptions) {
    const prompt = chatDraft.trim();

    void startCodexTask(prompt, options, {
      status: "working",
      phase: "Working",
      message: "Running your request in the selected repo.",
    });
  }

  function runCodexFunction(id: CodexFunctionId, options: CodexRunOptions) {
    const target = selectedNode?.title ?? "the observed graph";
    const prompt = `${functionPrompts[id]} Target: ${target}.`;

    void startCodexTask(prompt, options, quickActionPhase[id]);
  }

  async function selectRepo() {
    try {
      const response = await fetch("/api/repo/select", { method: "POST" });
      const data = (await response.json()) as {
        repoPath?: string;
        error?: string;
      };

      if (!response.ok || !data.repoPath) {
        throw new Error(data.error ?? "Folder selection failed.");
      }

      setRepoPath(data.repoPath);
      resetCanvas();
      setRunStatus("idle");
      setRunPhase("Ready");
      setRunMessage("Repository selected. Ask Codex what to build.");
      setRunStartedAt(undefined);
    } catch (error) {
      console.error(error);
    }
  }

  function repoLabel(path: string) {
    const parts = path.split("/").filter(Boolean);
    const tail = parts.slice(-2).join("/");

    return tail ? `/${tail}` : path;
  }

  if (!mounted) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f7f7f4] text-zinc-950">
        <div className="rounded-2xl border border-zinc-200 bg-white px-5 py-4 text-sm font-medium shadow-sm">
          Loading cocanvas...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-zinc-950">
      <main className="min-h-screen">
        <FeatureCanvas
          graph={graph}
          selectedNodeId={graph.selectedNodeId}
          onSelectNode={selectNode}
          topControls={
            <>
              <button
                type="button"
                onClick={selectRepo}
                title={repoPath}
                className="inline-flex h-11 items-center rounded-full border border-zinc-200 bg-white/95 px-5 text-sm font-semibold shadow-sm transition hover:bg-zinc-50"
              >
                <span className="font-semibold text-zinc-900">cocanvas</span>
                <span className="ml-2 max-w-[240px] truncate font-semibold text-zinc-500">
                  {repoLabel(repoPath)}
                </span>
              </button>
            </>
          }
          actionControls={
            <>
              <button
                type="button"
                disabled={isReplaying || isCodexRunning}
                onClick={runDemoReplay}
                className="h-11 rounded-full bg-zinc-950 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
              >
                {isReplaying ? "Replaying" : "Run Demo"}
              </button>
              <button
                type="button"
                onClick={handleResetCanvas}
                className="h-11 rounded-full border border-zinc-200 bg-white/95 px-5 text-sm font-semibold text-zinc-800 shadow-sm transition hover:bg-zinc-50"
              >
                Reset Canvas
              </button>
            </>
          }
          chatPanel={
            <CodexChatPanel
              draft={chatDraft}
              isRunning={isReplaying || isCodexRunning}
              onDraftChange={setChatDraft}
              onSubmit={submitCodexChat}
              onRunFunction={runCodexFunction}
            />
          }
          runStatusBar={
            <CodexRunStatusBar
              status={runStatus}
              phase={runPhase}
              message={runMessage}
              elapsed={elapsed}
            />
          }
        />
      </main>
    </div>
  );
}
