"use client";

import { useEffect, useState } from "react";
import { mockGraphEvents } from "@/lib/demo/mockGraphEvents";
import { useGraphStore } from "@/lib/state/graphStore";
import { FeatureCanvas } from "@/components/graph/FeatureCanvas";

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
  const [mounted, setMounted] = useState(false);
  const [repoPath, setRepoPath] = useState("Loading repo...");

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
      replayStatusForEvent(event);
      applyGraphEvent(event);
    }

    setIsReplaying(false);
  }

  function handleResetCanvas() {
    resetCanvas();
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
        />
      </main>
    </div>
  );
}
