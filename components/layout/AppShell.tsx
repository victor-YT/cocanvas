"use client";

import { useState } from "react";
import { MockCodexEventSource } from "@/lib/codex/MockCodexEventSource";
import { mockGraph } from "@/lib/demo/mockGraph";
import { mockCodexTask, mockPrd } from "@/lib/demo/mockPrd";
import { useGraphStore } from "@/lib/state/graphStore";
import type { GraphState } from "@/lib/types/graph";
import { BottomInspector } from "./BottomInspector";
import { RightTimeline } from "./RightTimeline";
import { TopBar } from "./TopBar";
import { FeatureCanvas } from "@/components/graph/FeatureCanvas";

export function AppShell() {
  const { graph, selectNode, applyEvent, replaceGraph } = useGraphStore();
  const [isReplaying, setIsReplaying] = useState(false);
  const [isGeneratingGraph, setIsGeneratingGraph] = useState(false);
  const [prd, setPrd] = useState(mockPrd);
  const [task, setTask] = useState(mockCodexTask);
  const [baselineGraph, setBaselineGraph] = useState<GraphState>(mockGraph);
  const [notice, setNotice] = useState<string>();

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

  return (
    <div className="flex min-h-screen flex-col bg-[#f6f7f9] text-zinc-950">
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
      <main className="grid min-h-0 flex-1 grid-cols-1 gap-3 p-3 lg:grid-cols-[1fr_360px]">
        <FeatureCanvas
          graph={graph}
          selectedNodeId={graph.selectedNodeId}
          onSelectNode={selectNode}
        />
        <RightTimeline events={graph.timeline} isReplaying={isReplaying} />
      </main>
      <BottomInspector graph={graph} selectedNodeId={graph.selectedNodeId} />
    </div>
  );
}
