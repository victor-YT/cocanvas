"use client";

import { useEffect, useRef, useState } from "react";
import { FolderGit2 } from "lucide-react";
import { mockGraphEvents } from "@/lib/demo/mockGraphEvents";
import { useGraphStore } from "@/lib/state/graphStore";
import type { GraphEvent, ObservedGraphNode } from "@/lib/types/observedGraph";
import { FeatureCanvas } from "@/components/graph/FeatureCanvas";
import {
  CodexChatPanel,
  type CodexComposerInput,
  type CodexRunOptions,
} from "@/components/codex/CodexChatPanel";
import {
  CodexRunStatusBar,
  type CodexRunStatus,
} from "@/components/codex/CodexRunStatusBar";

const nodeReplayDelayMs = 1000;
const updateReplayDelayMs = 180;
const demoProjectLabel = "cocanvas / demo-task-board";
const topPillClass =
  "h-11 rounded-full border border-zinc-200 bg-white/95 px-5 text-sm font-semibold text-zinc-800 shadow-sm transition-[transform,box-shadow,background-color] duration-150 hover:scale-[1.02] hover:bg-zinc-50 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100";
const primaryTopPillClass =
  "h-11 rounded-full bg-zinc-950 px-5 text-sm font-semibold text-white shadow-sm transition-[transform,box-shadow,background-color] duration-150 hover:scale-[1.02] hover:bg-zinc-800 hover:shadow-md disabled:cursor-not-allowed disabled:bg-zinc-400 disabled:hover:scale-100";

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

function replayBatchAt(index: number) {
  const event = mockGraphEvents[index];
  const batch = [event];
  let nextIndex = index + 1;

  while (event?.type === "node.upsert" && nextIndex < mockGraphEvents.length) {
    const nextEvent = mockGraphEvents[nextIndex];

    if (
      nextEvent.type !== "edge.upsert" ||
      nextEvent.edge.relation !== "contains" ||
      nextEvent.edge.to !== event.node.id
    ) {
      break;
    }

    batch.push(nextEvent);
    nextIndex += 1;
  }

  return {
    batch,
    nextIndex,
  };
}

function formatElapsed(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes === 0) {
    return `${seconds}s`;
  }

  return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
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

function uniqueNodesFromMentionIds(ids: string[], nodes: ObservedGraphNode[]) {
  const seen = new Set<string>();
  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  const referencedNodes: ObservedGraphNode[] = [];

  ids.forEach((id) => {
    if (seen.has(id)) {
      return;
    }

    const node = nodesById.get(id);

    if (!node) {
      return;
    }

    seen.add(id);
    referencedNodes.push(node);
  });

  return referencedNodes;
}

function featureContext(target: ObservedGraphNode) {
  const relatedFiles =
    target.relatedFiles.length > 0
      ? target.relatedFiles.map((file) => `  - ${file}`).join("\n")
      : "  - none observed";
  const evidence =
    target.evidence.length > 0
      ? target.evidence
          .map((item) => `  - ${item.summary}${item.path ? ` (${item.path})` : ""}`)
          .join("\n")
      : "  - none observed";
  const risks =
    target.risks.length > 0
      ? target.risks
          .map((item) => `  - ${item.summary}${item.path ? ` (${item.path})` : ""}`)
          .join("\n")
      : "  - none observed";
  const status =
    target.risks.length > 0 || target.status === "risk" ? "risk" : target.status;

  return `- ${target.title}
  id: ${target.id}
  status: ${status}
  evidence:
${evidence}
  risks:
${risks}
  related files:
${relatedFiles}`;
}

function promptForReferencedFeatures(
  userPrompt: string,
  referencedFeatures: ObservedGraphNode[],
) {
  if (referencedFeatures.length === 0) {
    return userPrompt;
  }

  return `User request:
${userPrompt}

Referenced features:
${referencedFeatures.map(featureContext).join("\n\n")}

Please focus changes on the referenced feature(s) unless necessary.`;
}

export function AppShell() {
  const {
    graph,
    selectNode,
    clearSelectedNode,
    applyGraphEvents,
    resetCanvas,
  } = useGraphStore([]);
  const [isReplaying, setIsReplaying] = useState(false);
  const [isCodexRunning, setIsCodexRunning] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [repoPath, setRepoPath] = useState("");
  const [canvasMode, setCanvasMode] = useState<"real" | "demo">("real");
  const [runStatus, setRunStatus] = useState<CodexRunStatus>("idle");
  const [runPhase, setRunPhase] = useState<string | undefined>("Ready");
  const [runMessage, setRunMessage] = useState("Choose a repo, then ask Codex what to build.");
  const [runStartedAt, setRunStartedAt] = useState<number>();
  const [elapsed, setElapsed] = useState("0s");
  const autoImportedRepoRef = useRef<string | undefined>(undefined);
  const isBusy = isReplaying || isCodexRunning || isImporting;
  const mentionOptions = graph.nodes
    .filter((node) => node.nodeType !== "evidence" && node.nodeType !== "risk")
    .map((node) => ({
      id: node.id,
      title: node.title,
      status: node.status,
    }));

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
    if (!runStartedAt || (runStatus !== "working" && runStatus !== "testing")) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setElapsed(formatElapsed(Date.now() - runStartedAt));
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [runStartedAt, runStatus]);

  async function runDemoReplay() {
    if (isBusy) {
      return;
    }

    setCanvasMode("demo");
    clearSelectedNode();
    setIsReplaying(true);
    setRunStatus("working");
    setRunPhase(undefined);
    setRunMessage("Mock feature events only.");
    setRunStartedAt(Date.now());
    setElapsed("0s");
    resetCanvas();

    for (let index = 0; index < mockGraphEvents.length; ) {
      const { batch, nextIndex } = replayBatchAt(index);
      const [event] = batch;

      if (!event) {
        break;
      }

      await wait(replayDelayForEvent(event));
      const nextStatus = replayStatusForEvent(event);
      setRunPhase(nextStatus.phase);
      setRunMessage(nextStatus.message);
      applyGraphEvents(batch);
      index = nextIndex;
    }

    setIsReplaying(false);
    setRunStatus("completed");
    setRunPhase(undefined);
    setRunMessage("Mock replay only.");
    setRunStartedAt(undefined);
  }

  async function handleResetCanvas() {
    if (isBusy) {
      return;
    }

    const shouldClearPersistedGraph = canvasMode === "real" && Boolean(repoPath);

    resetCanvas();
    clearSelectedNode();
    setCanvasMode("real");
    setRunStatus("idle");
    setRunPhase("Ready");
    setRunMessage("Choose a repo, then ask Codex what to build.");
    setRunStartedAt(undefined);

    if (shouldClearPersistedGraph) {
      await fetch("/api/graph/reset", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ repoPath }),
      }).catch((error) => console.error(error));
    }
  }

  async function startCodexTask(
    prompt: string,
    options: CodexRunOptions,
    referencedFeatures: ObservedGraphNode[],
    runIntent?: {
      status?: CodexRunStatus;
      phase?: string;
      message?: string;
    },
  ) {
    if (!prompt) {
      return;
    }

    if (isBusy) {
      return;
    }

    if (!repoPath) {
      setRunStatus("failed");
      setRunPhase("No project selected");
      setRunMessage("Choose a repository before running Codex.");
      return;
    }

    const finalPrompt = promptForReferencedFeatures(prompt, referencedFeatures);
    const referencedTitle =
      referencedFeatures.length === 1
        ? `@${referencedFeatures[0].title}`
        : `${referencedFeatures.length} referenced features`;

    setCanvasMode("real");
    setIsCodexRunning(true);
    setRunStatus(runIntent?.status ?? "working");
    setRunPhase(runIntent?.phase ?? "Working");
    setRunMessage(
      referencedFeatures.length > 0
        ? `Codex working on ${referencedTitle}`
        : runIntent?.message ?? "Sending the task to Codex App Server.",
    );
    setRunStartedAt(Date.now());
    setElapsed("0s");

    try {
      const response = await fetch("/api/codex/start", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          repoPath,
          prompt: finalPrompt,
          model: options.model,
          effort: options.effort,
        }),
      });
      const data = (await response.json()) as {
        assistantText?: string;
        graphEvents?: GraphEvent[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Codex task failed.");
      }

      applyGraphEvents(data.graphEvents ?? []);
      setRunStatus("completed");
      setRunPhase("Completed");
      setRunMessage(`${data.graphEvents?.length ?? 0} graph events applied.`);
    } catch (error) {
      setRunStatus("failed");
      setRunPhase("Needs attention");
      setRunMessage(error instanceof Error ? error.message : "Codex task failed.");
    } finally {
      setIsCodexRunning(false);
      setRunStartedAt(undefined);
    }
  }

  function submitCodexChat(input: CodexComposerInput, options: CodexRunOptions) {
    const prompt = input.text.trim();
    const referencedFeatures = uniqueNodesFromMentionIds(input.mentionIds, graph.nodes);

    if (!prompt) {
      return false;
    }

    if (isBusy) {
      return false;
    }

    if (!repoPath) {
      setRunStatus("failed");
      setRunPhase("No project selected");
      setRunMessage("Choose a repository before running Codex.");
      return false;
    }

    void startCodexTask(prompt, options, referencedFeatures, {
      status: "working",
      phase: "Working",
      message: "Running your request in the selected repo.",
    });

    return true;
  }

  useEffect(() => {
    if (!mounted || !repoPath || canvasMode !== "real" || isBusy) {
      return;
    }

    if (autoImportedRepoRef.current === repoPath) {
      return;
    }

    autoImportedRepoRef.current = repoPath;

    async function autoImportExistingRepo() {
      setCanvasMode("real");
      clearSelectedNode();
      setIsImporting(true);
      setRunStatus("working");
      setRunPhase("Syncing repo");
      setRunMessage("Scanning the current repository snapshot.");
      setRunStartedAt(Date.now());
      setElapsed("0s");
      resetCanvas();

      try {
        const response = await fetch("/api/repo/import", {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({ repoPath, persist: false }),
        });
        const data = (await response.json()) as {
          artifacts?: unknown[];
          events?: GraphEvent[];
          error?: string;
        };

        if (!response.ok) {
          throw new Error(data.error ?? "Repository import failed.");
        }

        applyGraphEvents(data.events ?? []);
        setRunStatus("completed");
        setRunPhase("Repo synced");
        setRunMessage(
          `${data.artifacts?.length ?? 0} files scanned - ${
            data.events?.length ?? 0
          } graph events applied.`,
        );
      } catch (error) {
        setRunStatus("failed");
        setRunPhase("Repo sync failed");
        setRunMessage(
          error instanceof Error ? error.message : "Repository import failed.",
        );
      } finally {
        setIsImporting(false);
        setRunStartedAt(undefined);
      }
    }

    void autoImportExistingRepo();
  }, [
    mounted,
    repoPath,
    canvasMode,
    isBusy,
    clearSelectedNode,
    resetCanvas,
    applyGraphEvents,
  ]);

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
      setCanvasMode("real");
      clearSelectedNode();
      setRunStatus("idle");
      setRunPhase("Ready");
      setRunMessage("Repository selected. Ask Codex what to build.");
      setRunStartedAt(undefined);
    } catch (error) {
      console.error(error);
    }
  }

  function projectName(path: string) {
    const parts = path.split("/").filter(Boolean);
    const name = parts.at(-1);

    return name || path;
  }

  function projectLabel() {
    if (canvasMode === "demo") {
      return demoProjectLabel;
    }

    if (!repoPath) {
      return "cocanvas / no project selected";
    }

    return `cocanvas / ${projectName(repoPath)}`;
  }

  function handleSelectNode(nodeId: string) {
    selectNode(nodeId);
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
          onSelectNode={handleSelectNode}
          topControls={
            <>
              <button
                type="button"
                onClick={selectRepo}
                title={repoPath}
                className="inline-flex h-11 items-center gap-2 rounded-full border border-zinc-200 bg-white/95 px-4 text-sm font-bold shadow-sm transition-[transform,box-shadow,background-color] duration-150 hover:scale-[1.02] hover:bg-zinc-50 hover:shadow-md"
              >
                <FolderGit2 className="h-4 w-4 text-zinc-600" strokeWidth={2.2} />
                <span className="max-w-[220px] truncate text-zinc-900">
                  {projectLabel()}
                </span>
              </button>
            </>
          }
          actionControls={
            <>
              <button
                type="button"
                disabled={isBusy}
                onClick={runDemoReplay}
                className={primaryTopPillClass}
              >
                {isReplaying ? "Replaying" : "Run Demo Replay"}
              </button>
              <button
                type="button"
                disabled={isBusy}
                onClick={handleResetCanvas}
                className={topPillClass}
              >
                Reset Canvas
              </button>
            </>
          }
          chatPanel={
            <CodexChatPanel
              isRunning={isBusy}
              mentionOptions={mentionOptions}
              onSubmit={submitCodexChat}
            />
          }
          runStatusBar={
            <CodexRunStatusBar
              status={runStatus}
              title={
                isReplaying
                  ? "Running demo replay"
                  : canvasMode === "demo" && runStatus === "completed"
                    ? `Demo completed · ${mockGraphEvents.length} graph events applied`
                    : undefined
              }
              phase={runPhase}
              message={runMessage}
              elapsed={elapsed}
            />
          }
        />
      </main>
    </div>
  );
}
