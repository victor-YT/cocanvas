"use client";

import { useEffect, useState } from "react";
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
  const [mounted, setMounted] = useState(false);

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

  function runCodexTask() {
    setNotice("Codex task execution is not wired yet. Use Demo Replay for now.");
  }

  function handleResetCanvas() {
    resetCanvas();
    setNotice("Canvas reset.");
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
