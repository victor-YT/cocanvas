"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FileText, RefreshCw, X } from "lucide-react";
import { mockGraphEvents } from "@/lib/demo/mockGraphEvents";
import {
  backendSnapshotToGraphEvents,
  type BackendFeatureNode,
  type BackendGraphSnapshot,
} from "@/lib/liveCanvas/backendGraphAdapter";
import { useGraphStore } from "@/lib/state/graphStore";
import { FeatureCanvas } from "@/components/graph/FeatureCanvas";
import type { GraphEvent } from "@/lib/types/observedGraph";

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

function isActiveLiveCanvasNode(node: BackendFeatureNode) {
  const hasWorkContext =
    node.changedFiles.length > 0 ||
    node.linkedThreadIds.length > 0 ||
    node.linkedWorktreePaths.length > 0;

  if (!hasWorkContext) {
    return false;
  }

  return ["planning", "editing", "testing", "blocked", "failed"].includes(node.status);
}

export function AppShell() {
  const {
    graph,
    selectNode,
    applyGraphEvent,
    replaceEvents,
    resetCanvas,
  } = useGraphStore([]);
  const [isReplaying, setIsReplaying] = useState(false);
  const [isSyncingRepo, setIsSyncingRepo] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [repoPath, setRepoPath] = useState(".");
  const [prdText, setPrdText] = useState("");
  const [isPrdPanelOpen, setIsPrdPanelOpen] = useState(false);
  const [syncNotice, setSyncNotice] = useState("Canvas is ready for feature-first work.");
  const repoGraphEventsRef = useRef<GraphEvent[]>([]);
  const liveGraphEventsRef = useRef<GraphEvent[]>([]);

  const replaceCombinedEvents = useCallback(
    (repoEvents: GraphEvent[], liveEvents: GraphEvent[]) => {
      repoGraphEventsRef.current = repoEvents;
      liveGraphEventsRef.current = liveEvents;
      replaceEvents([...repoEvents, ...liveEvents]);
    },
    [replaceEvents],
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

  useEffect(() => {
    let closed = false;

    async function refreshLiveCanvasGraph() {
      try {
        const response = await fetch("/api/live-canvas/graph", {
          cache: "no-store",
        });

        if (!response.ok) {
          return;
        }

        const snapshot = (await response.json()) as BackendGraphSnapshot;
        const liveEvents = backendSnapshotToGraphEvents(
          snapshot,
          isActiveLiveCanvasNode,
        );

        if (!closed) {
          replaceCombinedEvents(repoGraphEventsRef.current, liveEvents);
        }
      } catch {
        if (!closed) {
          setSyncNotice("Live Canvas backend is not connected yet.");
        }
      }
    }

    const source = new EventSource("/api/live-canvas/events/stream");

    source.onopen = () => {
      void refreshLiveCanvasGraph();
    };
    source.onmessage = () => {
      void refreshLiveCanvasGraph();
    };
    source.onerror = () => {
      void refreshLiveCanvasGraph();
    };

    void refreshLiveCanvasGraph();

    return () => {
      closed = true;
      source.close();
    };
  }, [replaceCombinedEvents]);

  async function runDemoReplay() {
    setIsReplaying(true);
    repoGraphEventsRef.current = [];
    liveGraphEventsRef.current = [];
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
    setSyncNotice("Canvas reset. Sync features to rebuild from the codebase.");
  }

  async function selectRepo() {
    try {
      const response = await fetch("/api/repo/select", { method: "POST" });
      const data = (await response.json()) as {
        repoPath?: string;
        canceled?: boolean;
        error?: string;
      };

      if (data.canceled) {
        setSyncNotice("Repository selection canceled. Keeping the current repo.");
        return;
      }

      if (!response.ok || !data.repoPath) {
        throw new Error(data.error ?? "Folder selection failed.");
      }

      setRepoPath(data.repoPath);
      await syncRepoFeatures(data.repoPath);
    } catch (error) {
      console.warn(error);
      setSyncNotice(
        error instanceof Error ? error.message : "Could not select a repository.",
      );
    }
  }

  async function syncRepoFeatures(nextRepoPath = repoPath) {
    setIsSyncingRepo(true);
    setSyncNotice("Scanning selected repository and rebuilding feature nodes...");

    try {
      const response = await fetch("/api/scan-repo", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ repoPath: nextRepoPath, prd: prdText }),
      });
      const data = (await response.json()) as {
        artifacts?: unknown[];
        graphEvents?: GraphEvent[];
        error?: string;
      };

      if (!response.ok || !Array.isArray(data.graphEvents)) {
        throw new Error(data.error ?? "Repository feature sync failed.");
      }

      replaceCombinedEvents(data.graphEvents, liveGraphEventsRef.current);
      setSyncNotice(
        prdText.trim()
          ? `Synced ${repoLabel(nextRepoPath)} against the PRD: ${data.graphEvents.length} graph events.`
          : `Synced ${repoLabel(nextRepoPath)}: ${data.artifacts?.length ?? 0} files into ${data.graphEvents.length} graph events.`,
      );
    } catch (error) {
      console.error(error);
      setSyncNotice(
        error instanceof Error ? error.message : "Repository feature sync failed.",
      );
    } finally {
      setIsSyncingRepo(false);
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
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsPrdPanelOpen((current) => !current)}
                  className={`inline-flex h-11 items-center gap-2 rounded-full border px-4 text-sm font-semibold shadow-sm transition ${
                    prdText.trim()
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                      : "border-zinc-200 bg-white/95 text-zinc-800 hover:bg-zinc-50"
                  }`}
                >
                  <FileText aria-hidden="true" className="h-4 w-4" />
                  PRD
                </button>
                {isPrdPanelOpen ? (
                  <div className="absolute left-0 top-13 z-40 w-[min(420px,calc(100vw-2rem))] rounded-2xl border border-zinc-200 bg-white/96 p-3 text-zinc-900 shadow-[0_18px_48px_rgba(24,24,27,0.14)] backdrop-blur">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-bold">PRD source</div>
                        <div className="mt-0.5 text-xs font-semibold text-zinc-500">
                          Sync will validate code against this product intent.
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsPrdPanelOpen(false)}
                        className="grid h-8 w-8 place-items-center rounded-full text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900"
                        aria-label="Close PRD panel"
                      >
                        <X aria-hidden="true" className="h-4 w-4" />
                      </button>
                    </div>
                    <textarea
                      value={prdText}
                      onChange={(event) => setPrdText(event.target.value)}
                      placeholder={"Product name\nOpen task dashboard\n- User can see existing tasks\n- User can open task details"}
                      className="mt-3 h-44 w-full resize-none rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm font-semibold leading-5 text-zinc-800 outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 focus:bg-white"
                    />
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => setPrdText("")}
                        className="h-9 rounded-full border border-zinc-200 bg-white px-3 text-xs font-bold text-zinc-600 transition hover:bg-zinc-50"
                      >
                        Clear
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsPrdPanelOpen(false);
                          void syncRepoFeatures();
                        }}
                        disabled={isSyncingRepo}
                        className="h-9 rounded-full bg-zinc-950 px-4 text-xs font-bold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
                      >
                        Sync With PRD
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
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
                disabled={isSyncingRepo}
                onClick={() => void syncRepoFeatures()}
                className="inline-flex h-11 items-center gap-2 rounded-full bg-zinc-950 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
              >
                <RefreshCw
                  aria-hidden="true"
                  className={`h-4 w-4 ${isSyncingRepo ? "animate-spin" : ""}`}
                />
                {isSyncingRepo ? "Syncing" : "Sync Features"}
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
          runStatusBar={
            syncNotice ? (
              <div className="pointer-events-auto rounded-full border border-zinc-200 bg-white/95 px-4 py-2 text-xs font-bold text-zinc-600 shadow-sm">
                {syncNotice}
              </div>
            ) : null
          }
        />
      </main>
    </div>
  );
}
