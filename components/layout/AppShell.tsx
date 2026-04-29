"use client";

import { useState } from "react";
import { mockGraphEvents } from "@/lib/demo/mockGraphEvents";
import { useGraphStore } from "@/lib/state/graphStore";
import { FeatureCanvas } from "@/components/graph/FeatureCanvas";
import { RightTimeline } from "./RightTimeline";
import { TopBar } from "./TopBar";

const replayDelayMs = 420;

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function AppShell() {
  const {
    graph,
    events,
    selectNode,
    applyGraphEvent,
    resetCanvas,
  } = useGraphStore([]);
  const [isReplaying, setIsReplaying] = useState(false);
  const [currentRun, setCurrentRun] = useState("Demo run");
  const [notice, setNotice] = useState<string>();

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

  function runCodexTask() {
    setNotice("Codex task execution is not wired yet. Use Demo Replay for now.");
  }

  function handleResetCanvas() {
    resetCanvas();
    setNotice("Canvas reset.");
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f7f7f4] text-zinc-950">
      <TopBar
        currentRun={currentRun}
        isReplaying={isReplaying}
        notice={notice}
        onCurrentRunChange={setCurrentRun}
        onRunDemo={runDemoReplay}
        onRunCodexTask={runCodexTask}
        onResetCanvas={handleResetCanvas}
      />
      <main className="grid min-h-0 flex-1 grid-cols-1 gap-3 p-3 lg:grid-cols-[1fr_360px]">
        <FeatureCanvas
          graph={graph}
          selectedNodeId={graph.selectedNodeId}
          onSelectNode={selectNode}
        />
        <RightTimeline
          graph={graph}
          eventCount={events.length}
          isReplaying={isReplaying}
        />
      </main>
    </div>
  );
}
