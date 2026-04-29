"use client";

import { useCallback, useMemo, useState } from "react";
import { MockCodexEventSource } from "@/lib/codex/MockCodexEventSource";
import { mockGraph } from "@/lib/demo/mockGraph";
import { mockCodexTask } from "@/lib/demo/mockPrd";
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
  plan: "Plan the next feature-first implementation steps.",
  implement: "Implement this feature end-to-end.",
  test: "Run the relevant checks for this feature.",
  review: "Review the feature diff and summarize evidence.",
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
  const [task, setTask] = useState(mockCodexTask);
  const [baselineGraph] = useState<GraphState>(initialGraph ?? mockGraph);
  const [notice, setNotice] = useState<string>();
  const [chatDraft, setChatDraft] = useState("");
  const [chatMessages, setChatMessages] = useState<CodexChatMessage[]>([
    {
      id: "codex-welcome",
      role: "codex",
      text: "Select a feature node, then plan, build, test, or review it with canvas context.",
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
      text: `Queued ${id} for ${target} with ${describeOptions(options)}. The backend SDK route can execute this with graph, selected feature, timeline, and repo context.`,
    });
    setNotice(`Queued Codex ${id} for ${target}.`);
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f4f5f2] text-zinc-950">
      <TopBar
        task={task}
        isReplaying={isReplaying}
        notice={notice}
        onTaskChange={setTask}
        onRunDemo={runDemoReplay}
        featureCount={graph.features.filter((feature) => feature.status !== "drift").length}
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
