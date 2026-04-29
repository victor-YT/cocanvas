"use client";

import { useCallback, useMemo, useState } from "react";
import { MockCodexEventSource } from "@/lib/codex/MockCodexEventSource";
import { mockGraph } from "@/lib/demo/mockGraph";
import { mockCodexTask, mockPrd } from "@/lib/demo/mockPrd";
import { useCanvasEventStream } from "@/lib/hooks/useCanvasEventStream";
import { useGraphStore } from "@/lib/state/graphStore";
import type { GraphState } from "@/lib/types/graph";
import {
  type CodexChatMessage,
  type CodexFunctionId,
  type CodexRunOptions,
} from "@/components/codex/CodexChatPanel";
import { NodeSidePanel } from "@/components/inspector/NodeSidePanel";
import { TopBar } from "./TopBar";
import { FeatureCanvas } from "@/components/graph/FeatureCanvas";

const functionPrompts: Record<CodexFunctionId, string> = {
  plan: "Plan the next implementation steps.",
  implement: "Implement this feature end-to-end.",
  edit: "Edit the files needed for this feature only.",
  test: "Generate and run the relevant tests.",
  fix: "Fix the latest failing or risky behavior.",
  review: "Review the diff and summarize evidence.",
  explain: "Explain this feature in product language.",
  scope: "Check whether the work stayed inside PRD scope.",
};

const configuredLiveCanvasApiUrl =
  process.env.NEXT_PUBLIC_LIVE_CANVAS_API_URL?.replace(/\/$/, "");
const liveCanvasApiUrl =
  configuredLiveCanvasApiUrl && configuredLiveCanvasApiUrl.length > 0
    ? configuredLiveCanvasApiUrl
    : "/api/live-canvas";

type AppShellProps = {
  initialGraph?: GraphState;
};

export function AppShell({ initialGraph }: AppShellProps) {
  const { graph, selectNode, applyEvent, replaceGraph } = useGraphStore(initialGraph);
  const [isReplaying, setIsReplaying] = useState(false);
  const [isGeneratingGraph, setIsGeneratingGraph] = useState(false);
  const [prd, setPrd] = useState(mockPrd);
  const [task, setTask] = useState(mockCodexTask);
  const [baselineGraph, setBaselineGraph] = useState<GraphState>(
    initialGraph ?? mockGraph,
  );
  const [notice, setNotice] = useState<string>();
  const [chatDraft, setChatDraft] = useState("");
  const [chatMessages, setChatMessages] = useState<CodexChatMessage[]>([
    {
      id: "codex-welcome",
      role: "codex",
      text: "I can plan, implement, edit files, run tests, fix failures, review diffs, explain changes, and guard scope. Select a feature or ask me what to do next.",
    },
  ]);

  const selectedNode = graph.features.find(
    (node) => node.id === graph.selectedNodeId,
  );
  const handleGraphSnapshot = useCallback(
    (nextGraph: GraphState) => {
      replaceGraph(nextGraph);
      setNotice("Live canvas graph refreshed from the backend event store.");
    },
    [replaceGraph],
  );
  const handleCodexEvent = useCallback(
    (event: Parameters<typeof applyEvent>[0]) => {
      applyEvent(event);
    },
    [applyEvent],
  );
  const streamHandlers = useMemo(
    () => ({
      initialStatus: initialGraph ? ("connected" as const) : undefined,
      onGraphSnapshot: handleGraphSnapshot,
      onCodexEvent: handleCodexEvent,
    }),
    [handleCodexEvent, handleGraphSnapshot, initialGraph],
  );
  const { status: streamStatus } = useCanvasEventStream(streamHandlers);

  function appendChatMessage(message: Omit<CodexChatMessage, "id">) {
    setChatMessages((current) => [
      ...current,
      {
        ...message,
        id: `chat-${Date.now()}-${current.length}`,
      },
    ]);
  }

  async function generateGraph() {
    setIsGeneratingGraph(true);
    setNotice(undefined);

    try {
      const response = await fetch("/api/parse-prd", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prd }),
      });

      if (!response.ok) {
        throw new Error("The PRD parser returned an error.");
      }

      const body = (await response.json()) as { graph: GraphState };
      setBaselineGraph(body.graph);
      replaceGraph(body.graph);
      setNotice("Graph generated from the pasted PRD.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not generate graph.");
    } finally {
      setIsGeneratingGraph(false);
    }
  }

  async function runDemoReplay() {
    setIsReplaying(true);
    setNotice(undefined);
    replaceGraph(baselineGraph);

    try {
      const source = new MockCodexEventSource();
      for await (const event of source.startTask({
        repoPath: ".",
        prompt: task,
      })) {
        applyEvent(event);
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Demo replay failed.");
    } finally {
      setIsReplaying(false);
    }
  }

  function describeOptions(options: CodexRunOptions) {
    const access =
      options.access === "ask"
        ? "ask-before-edits"
        : options.access === "workspace"
          ? "workspace-write"
          : "full-access";

    return `${options.model} model, ${options.speed} speed, ${options.usage} usage, ${access}, ${options.parallel ? "parallel work" : "single work stream"}`;
  }

  async function submitCodexChat(options: CodexRunOptions) {
    const prompt = chatDraft.trim();

    if (!prompt) {
      return;
    }

    appendChatMessage({ role: "user", text: prompt });
    setChatDraft("");

    if (!selectedNode) {
      appendChatMessage({
        role: "codex",
        text: `Ready to send this to the Codex SDK with the full feature map as context and ${describeOptions(options)}.`,
      });
      return;
    }

    try {
      const response = await fetch(
        `${liveCanvasApiUrl}/nodes/${encodeURIComponent(selectedNode.id)}/chat`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            content: prompt,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`Live Canvas backend returned ${response.status}.`);
      }

      appendChatMessage({
        role: "codex",
        text: `Stored node-scoped follow-up for ${selectedNode.name} with ${describeOptions(options)}.`,
      });
    } catch (error) {
      appendChatMessage({
        role: "codex",
        text:
          error instanceof Error
            ? `Could not store the node follow-up: ${error.message}`
            : "Could not store the node follow-up.",
      });
    }
  }

  function runCodexFunction(id: CodexFunctionId, options: CodexRunOptions) {
    const target = selectedNode?.name ?? "the current feature map";
    const prompt = `${functionPrompts[id]} Target: ${target}.`;

    setTask(prompt);
    appendChatMessage({ role: "user", text: prompt });
    appendChatMessage({
      role: "codex",
      text: `Queued ${id} for ${target} with ${describeOptions(options)}. The backend SDK route can execute this with PRD, graph, selected feature, timeline, and repo context.`,
    });
    setNotice(`Queued Codex ${id} for ${target}.`);
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f4f5f2] text-zinc-950">
      <TopBar
        prd={prd}
        task={task}
        isReplaying={isReplaying}
        isGeneratingGraph={isGeneratingGraph}
        notice={notice}
        onPrdChange={setPrd}
        onTaskChange={setTask}
        onGenerateGraph={generateGraph}
        onRunDemo={runDemoReplay}
      />
      <main className="min-h-0 flex-1 p-3">
        <div className="grid min-h-0 gap-3 xl:grid-cols-[minmax(0,1fr)_420px]">
          <FeatureCanvas
            graph={graph}
            selectedNodeId={graph.selectedNodeId}
            onSelectNode={selectNode}
          />
          <NodeSidePanel
            node={selectedNode}
            messages={chatMessages}
            draft={chatDraft}
            streamStatus={streamStatus}
            timeline={graph.timeline}
            onDraftChange={setChatDraft}
            onSubmit={submitCodexChat}
            onRunFunction={runCodexFunction}
          />
        </div>
      </main>
    </div>
  );
}
