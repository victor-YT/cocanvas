"use client";

import { useEffect, useState } from "react";
import { mockGraphEvents } from "@/lib/demo/mockGraphEvents";
import { useGraphStore } from "@/lib/state/graphStore";
import type { GraphEvent } from "@/lib/types/observedGraph";
import { FeatureCanvas } from "@/components/graph/FeatureCanvas";
import {
  CodexChatPanel,
  type CodexChatMessage,
  type CodexFunctionId,
  type CodexRunOptions,
} from "@/components/codex/CodexChatPanel";

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
  const [chatMessages, setChatMessages] = useState<CodexChatMessage[]>([
    {
      id: "codex-welcome",
      role: "codex",
      text: "Ask Codex to build, test, review, or explain the observed feature graph.",
    },
  ]);

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

  async function runDemoReplay() {
    setIsReplaying(true);
    resetCanvas();

    for (const event of mockGraphEvents) {
      await wait(replayDelayForEvent(event));
      applyGraphEvent(event);
    }

    setIsReplaying(false);
  }

  function handleResetCanvas() {
    resetCanvas();
  }

  function appendChatMessage(message: Omit<CodexChatMessage, "id">) {
    setChatMessages((current) => [
      ...current,
      {
        ...message,
        id: `chat-${Date.now()}-${current.length}`,
      },
    ]);
  }

  function describeOptions(options: CodexRunOptions) {
    return `${options.model}, ${options.speed}, ${options.access}`;
  }

  function modelForCodex(options: CodexRunOptions) {
    return options.model === "auto" ? undefined : options.model;
  }

  async function startCodexTask(prompt: string, options: CodexRunOptions) {
    if (!prompt) {
      return;
    }

    appendChatMessage({ role: "user", text: prompt });
    appendChatMessage({
      role: "codex",
      text: selectedNode
        ? `Queued for ${selectedNode.title} with ${describeOptions(options)}.`
        : `Queued for the observed graph with ${describeOptions(options)}.`,
    });
    setIsCodexRunning(true);
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
      appendChatMessage({
        role: "codex",
        text: data.assistantText?.trim() || "Codex completed the task.",
      });
    } catch (error) {
      appendChatMessage({
        role: "codex",
        text: error instanceof Error ? error.message : "Codex task failed.",
      });
    } finally {
      setIsCodexRunning(false);
    }
  }

  function submitCodexChat(options: CodexRunOptions) {
    const prompt = chatDraft.trim();

    void startCodexTask(prompt, options);
  }

  function runCodexFunction(id: CodexFunctionId, options: CodexRunOptions) {
    const target = selectedNode?.title ?? "the observed graph";
    const prompt = `${functionPrompts[id]} Target: ${target}.`;

    void startCodexTask(prompt, options);
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
              selectedNode={selectedNode}
              messages={chatMessages}
              draft={chatDraft}
              isReplaying={isReplaying || isCodexRunning}
              onDraftChange={setChatDraft}
              onSubmit={submitCodexChat}
              onRunFunction={runCodexFunction}
            />
          }
        />
      </main>
    </div>
  );
}
