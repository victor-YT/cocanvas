"use client";

import { useState } from "react";
import { MockCodexEventSource } from "@/lib/codex/MockCodexEventSource";
import { mockGraph } from "@/lib/demo/mockGraph";
import { mockCodexTask } from "@/lib/demo/mockPrd";
import { useGraphStore } from "@/lib/state/graphStore";
import type { GraphState } from "@/lib/types/graph";
import { RightTimeline } from "./RightTimeline";
import { TopBar } from "./TopBar";
import { FeatureCanvas } from "@/components/graph/FeatureCanvas";

export function AppShell() {
  const { graph, selectNode, applyEvent, replaceGraph } = useGraphStore();
  const [isReplaying, setIsReplaying] = useState(false);
  const [task, setTask] = useState(mockCodexTask);
  const [baselineGraph, setBaselineGraph] = useState<GraphState>(mockGraph);
  const [notice, setNotice] = useState<string>();

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
      setBaselineGraph(mockGraph);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f6f7f9] text-zinc-950">
      <TopBar
        task={task}
        isReplaying={isReplaying}
        notice={notice}
        onTaskChange={setTask}
        onRunDemo={runDemoReplay}
      />
      <main className="grid min-h-0 flex-1 grid-cols-1 gap-3 p-3 lg:grid-cols-[1fr_320px]">
        <FeatureCanvas
          graph={graph}
          selectedNodeId={graph.selectedNodeId}
          onSelectNode={selectNode}
        />
        <RightTimeline events={graph.timeline} isReplaying={isReplaying} />
      </main>
    </div>
  );
}
