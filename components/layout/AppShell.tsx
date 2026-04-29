"use client";

import { useEffect, useState } from "react";
import { mockGraphEvents } from "@/lib/demo/mockGraphEvents";
import { useGraphStore } from "@/lib/state/graphStore";
import { FeatureCanvas } from "@/components/graph/FeatureCanvas";
import {
  CodexChatPanel,
  type CodexChatMessage,
  type CodexFunctionId,
  type CodexRunOptions,
} from "@/components/codex/CodexChatPanel";

const replayDelayMs = 420;

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
  const [notice, setNotice] = useState<string>();
  const [mounted, setMounted] = useState(false);
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

  async function runDemoReplay() {
    setIsReplaying(true);
    setNotice(undefined);
    resetCanvas();

    for (const event of mockGraphEvents) {
      await wait(replayDelayMs);
      applyGraphEvent(event);
    }

    setIsReplaying(false);
    setNotice("Demo replay finished.");
  }

  function handleResetCanvas() {
    resetCanvas();
    setNotice("Canvas reset.");
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

  function submitCodexChat(options: CodexRunOptions) {
    const prompt = chatDraft.trim();

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
    setNotice("Codex task queued.");
    setChatDraft("");
  }

  function runCodexFunction(id: CodexFunctionId, options: CodexRunOptions) {
    const target = selectedNode?.title ?? "the observed graph";
    const prompt = `${functionPrompts[id]} Target: ${target}.`;

    appendChatMessage({ role: "user", text: prompt });
    appendChatMessage({
      role: "codex",
      text: `Queued ${id} for ${target} with ${describeOptions(options)}.`,
    });
    setNotice(`Queued Codex ${id}.`);
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
    <div className="min-h-screen bg-[#f7f7f4] text-zinc-950">
      <main className="min-h-screen p-3">
        <FeatureCanvas
          graph={graph}
          selectedNodeId={graph.selectedNodeId}
          onSelectNode={selectNode}
          topControls={
            <>
              <div className="rounded-full border border-zinc-200 bg-white/95 px-4 py-2 text-sm shadow-sm">
                <span className="font-semibold text-zinc-900">cocanvas</span>
                <span className="ml-2 text-zinc-500">/projects/cocanvas</span>
              </div>
              <div className="rounded-full border border-zinc-200 bg-white/95 px-4 py-2 text-sm shadow-sm">
                <span className="font-medium text-zinc-900">Observed graph</span>
                <span className="ml-2 text-zinc-500">
                  {graph.nodes.length} nodes
                </span>
              </div>
              {notice ? (
                <div className="rounded-full border border-zinc-200 bg-white/95 px-3 py-2 text-xs text-zinc-500 shadow-sm">
                  {notice}
                </div>
              ) : null}
            </>
          }
          actionControls={
            <>
              <button
                type="button"
                disabled={isReplaying}
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
              isReplaying={isReplaying}
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
