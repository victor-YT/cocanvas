"use client";

import { useState } from "react";
import { MockCodexEventSource } from "@/lib/codex/MockCodexEventSource";
import { mockCodexTask, mockPrd } from "@/lib/demo/mockPrd";
import { useGraphStore } from "@/lib/state/graphStore";
import { BottomInspector } from "./BottomInspector";
import { RightTimeline } from "./RightTimeline";
import { TopBar } from "./TopBar";
import { FeatureCanvas } from "@/components/graph/FeatureCanvas";

export function AppShell() {
  const { graph, selectNode, applyEvent, resetGraph } = useGraphStore();
  const [isReplaying, setIsReplaying] = useState(false);
  const [prd, setPrd] = useState(mockPrd);
  const [task, setTask] = useState(mockCodexTask);

  async function runDemoReplay() {
    setIsReplaying(true);
    resetGraph();

    const source = new MockCodexEventSource();
    for await (const event of source.startTask({
      repoPath: ".",
      prompt: task,
    })) {
      applyEvent(event);
    }

    setIsReplaying(false);
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f6f7f9] text-zinc-950">
      <TopBar
        prd={prd}
        task={task}
        isReplaying={isReplaying}
        onPrdChange={setPrd}
        onTaskChange={setTask}
        onRunDemo={runDemoReplay}
      />
      <main className="grid min-h-0 flex-1 grid-cols-1 gap-3 p-3 lg:grid-cols-[1fr_360px]">
        <FeatureCanvas
          graph={graph}
          selectedNodeId={graph.selectedNodeId}
          onSelectNode={selectNode}
        />
        <RightTimeline events={graph.timeline} />
      </main>
      <BottomInspector graph={graph} selectedNodeId={graph.selectedNodeId} />
    </div>
  );
}
