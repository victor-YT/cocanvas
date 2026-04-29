"use client";

import { useEffect, useState } from "react";
import type { CodexTimelineEvent } from "@/lib/types/codex";
import type { ArtifactKind, FeatureStatus, GraphState } from "@/lib/types/graph";

type BackendFeatureStatus =
  | "idle"
  | "planning"
  | "editing"
  | "testing"
  | "blocked"
  | "done"
  | "failed";

type BackendTestStatus = "unknown" | "running" | "passed" | "failed";

type BackendRiskLevel = "low" | "medium" | "high";

type BackendFeatureNode = {
  id: string;
  title: string;
  description?: string;
  originalPrompt: string;
  status: BackendFeatureStatus;
  linkedThreadIds: string[];
  linkedWorktreePaths: string[];
  changedFiles: string[];
  diffSummary?: string;
  testStatus: BackendTestStatus;
  testCommand?: string;
  testOutputSummary?: string;
  riskLevel: BackendRiskLevel;
  riskReasons: string[];
  summary?: string;
  createdAt: string;
  lastUpdatedAt: string;
};

type BackendCanvasEvent = {
  id: string;
  type: string;
  nodeId?: string;
  nodeIds?: string[];
  title?: string;
  filePath?: string;
  changedFiles?: string[];
  files?: string[];
  command?: string;
  testStatus?: BackendTestStatus;
  diffSummary?: string;
  reason?: string;
  content?: string;
  timestamp: string;
};

type BackendGraphSnapshot = {
  nodes: BackendFeatureNode[];
  events: BackendCanvasEvent[];
  conflicts: BackendCanvasEvent[];
};

type CanvasStreamPayload =
  | CodexTimelineEvent
  | BackendCanvasEvent
  | {
      type: "graph_snapshot";
      graph: GraphState;
    }
  | {
      type: "codex_event";
      event: CodexTimelineEvent;
    };

type StreamStatus = "connecting" | "connected" | "disconnected";

type UseCanvasEventStreamOptions = {
  initialStatus?: StreamStatus;
  onGraphSnapshot: (graph: GraphState) => void;
  onCodexEvent: (event: CodexTimelineEvent) => void;
};

const configuredBackendApiUrl =
  process.env.NEXT_PUBLIC_LIVE_CANVAS_API_URL?.replace(/\/$/, "");
const backendApiUrl =
  configuredBackendApiUrl && configuredBackendApiUrl.length > 0
    ? configuredBackendApiUrl
    : "/api/live-canvas";

const eventTypes = new Set([
  "turn_started",
  "turn_completed",
  "plan_updated",
  "file_change",
  "diff_updated",
  "command_started",
  "command_completed",
  "test_passed",
  "test_failed",
  "agent_message",
  "error",
]);

function isCodexEvent(payload: CanvasStreamPayload): payload is CodexTimelineEvent {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "type" in payload &&
    eventTypes.has(String(payload.type)) &&
    "id" in payload &&
    "timestamp" in payload
  );
}

function isBackendCanvasEvent(payload: CanvasStreamPayload): payload is BackendCanvasEvent {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "type" in payload &&
    String(payload.type).includes(".") &&
    "timestamp" in payload
  );
}

function mapBackendStatus(status: BackendFeatureStatus, riskLevel: BackendRiskLevel): FeatureStatus {
  if (riskLevel === "high" || status === "blocked" || status === "failed") {
    return "risk";
  }

  if (status === "done") {
    return "verified";
  }

  if (status === "editing" || status === "testing" || status === "planning") {
    return "in_progress";
  }

  return "not_started";
}

function artifactKindForPath(path: string): ArtifactKind {
  if (/\b(api|route)\b|\/api\//i.test(path)) {
    return "api";
  }

  if (/\b(test|spec)\b/i.test(path)) {
    return "test";
  }

  if (/\.(tsx|jsx|css)$/i.test(path)) {
    return "ui";
  }

  if (/\.(ts|js)$/i.test(path)) {
    return "service";
  }

  return "unknown";
}

function backendEventTitle(event: BackendCanvasEvent) {
  switch (event.type) {
    case "node.created":
      return event.title ?? "Feature node created";
    case "node.status.updated":
      return "Feature status updated";
    case "file.changed":
      return event.filePath ? `Changed ${event.filePath}` : "File changed";
    case "diff.attached":
      return "Diff summary attached";
    case "test.updated":
      return event.command ?? "Test result updated";
    case "conflict.detected":
      return "Conflict detected";
    case "message.created":
      return "Node chat message";
    case "thread.started":
      return "Codex thread started";
    default:
      return event.type;
  }
}

function backendEventToTimeline(event: BackendCanvasEvent): CodexTimelineEvent {
  const isTestFailure = event.type === "test.updated" && event.testStatus === "failed";
  const isTestPass = event.type === "test.updated" && event.testStatus === "passed";

  return {
    id: event.id,
    type:
      event.type === "file.changed"
        ? "file_change"
        : event.type === "diff.attached"
          ? "diff_updated"
          : event.type === "conflict.detected"
            ? "conflict_detected"
            : isTestFailure
              ? "test_failed"
              : isTestPass
                ? "test_passed"
                : event.type === "test.updated"
                  ? "command_completed"
                  : "agent_message",
    title: backendEventTitle(event),
    detail: event.diffSummary ?? event.reason ?? event.content,
    timestamp: event.timestamp,
    paths: event.filePath
      ? [event.filePath]
      : event.changedFiles ?? event.files,
    command: event.command,
    featureIds: event.nodeId ? [event.nodeId] : event.nodeIds,
    exitCode:
      event.type === "test.updated"
        ? event.testStatus === "failed"
          ? 1
          : 0
        : undefined,
    raw: event,
  };
}

function backendSnapshotToGraph(snapshot: BackendGraphSnapshot): GraphState {
  const timeline = snapshot.events.map(backendEventToTimeline).reverse();

  return {
    selectedNodeId: snapshot.nodes.at(-1)?.id,
    edges: snapshot.conflicts.flatMap((conflict) => {
      const [from, to] = conflict.nodeIds ?? [];

      if (!from || !to) {
        return [];
      }

      return [
        {
          id: conflict.id,
          from,
          to,
          type: "depends_on" as const,
          confidence: 0.9,
          evidenceIds: [conflict.id],
        },
      ];
    }),
    timeline,
    features: snapshot.nodes.map((node) => ({
      id: node.id,
      name: node.title,
      description: node.description ?? node.summary ?? node.originalPrompt,
      source: "codex" as const,
      status: mapBackendStatus(node.status, node.riskLevel),
      confidence: 0.9,
      riskSummary:
        node.riskReasons.length > 0
          ? node.riskReasons.join("; ")
          : node.riskLevel !== "low"
            ? `${node.riskLevel} risk`
            : undefined,
      acceptanceCriteria: [
        {
          id: `${node.id}-test-status`,
          text: `Latest test status is ${node.testStatus}.`,
          status:
            node.testStatus === "passed"
              ? "verified"
              : node.testStatus === "failed"
                ? "risk"
                : "unknown",
          evidenceIds: node.testCommand ? [`${node.id}-test-evidence`] : [],
        },
      ],
      artifacts: node.changedFiles.map((path) => ({
        id: `${node.id}-${path.replace(/[^a-z0-9]/gi, "-")}`,
        path,
        kind: artifactKindForPath(path),
        role: "Changed file",
        confidence: 0.9,
        evidence: node.diffSummary ?? "Reported by Live Canvas backend.",
      })),
      evidence: [
        {
          id: `${node.id}-prompt`,
          type: "codex_plan" as const,
          title: "Original prompt",
          detail: node.originalPrompt,
          confidence: 0.9,
        },
        ...(node.diffSummary
          ? [
              {
                id: `${node.id}-diff`,
                type: "diff" as const,
                title: "Diff summary",
                detail: node.diffSummary,
                confidence: 0.9,
              },
            ]
          : []),
        ...(node.testCommand
          ? [
              {
                id: `${node.id}-test-evidence`,
                type: "test_result" as const,
                title: node.testCommand,
                detail: node.testOutputSummary ?? `Tests ${node.testStatus}.`,
                confidence: 0.9,
              },
            ]
          : []),
      ],
    })),
  };
}

async function fetchBackendGraph() {
  const response = await fetch(`${backendApiUrl}/graph`);

  if (!response.ok) {
    throw new Error(`Live Canvas backend graph fetch failed: ${response.status}`);
  }

  return backendSnapshotToGraph((await response.json()) as BackendGraphSnapshot);
}

function handlePayload(
  payload: CanvasStreamPayload,
  options: UseCanvasEventStreamOptions,
  refreshBackendGraph: () => void,
) {
  if (isCodexEvent(payload)) {
    options.onCodexEvent(payload);
    return;
  }

  if (isBackendCanvasEvent(payload)) {
    options.onCodexEvent(backendEventToTimeline(payload));
    refreshBackendGraph();
    return;
  }

  if (payload.type === "codex_event") {
    options.onCodexEvent(payload.event);
    return;
  }

  if (payload.type === "graph_snapshot") {
    options.onGraphSnapshot(payload.graph);
  }
}

export function useCanvasEventStream(options: UseCanvasEventStreamOptions) {
  const [status, setStatus] = useState<StreamStatus>(
    options.initialStatus ?? "connecting",
  );
  const [lastEventAt, setLastEventAt] = useState<string>();

  useEffect(() => {
    let closed = false;
    const source = new EventSource(`${backendApiUrl}/events/stream`);
    const refreshBackendGraph = () => {
      void fetchBackendGraph()
        .then((graph) => {
          if (!closed) {
            setStatus("connected");
            options.onGraphSnapshot(graph);
          }
        })
        .catch(() => {
          if (!closed) {
            setStatus("disconnected");
          }
        });
    };
    const handleMessage = (message: MessageEvent<string>) => {
      try {
        const payload = JSON.parse(message.data) as CanvasStreamPayload;
        handlePayload(payload, options, refreshBackendGraph);
        setLastEventAt(new Date().toISOString());
      } catch {
        // Ignore malformed keepalive or partially-written demo events.
      }
    };

    source.onopen = () => {
      if (!closed) {
        setStatus("connected");
        refreshBackendGraph();
      }
    };

    source.onmessage = handleMessage;
    source.addEventListener("codex_event", handleMessage);
    source.addEventListener("graph_snapshot", handleMessage);

    source.onerror = () => {
      if (!closed) {
        refreshBackendGraph();
      }
    };

    refreshBackendGraph();

    return () => {
      closed = true;
      source.removeEventListener("codex_event", handleMessage);
      source.removeEventListener("graph_snapshot", handleMessage);
      source.close();
    };
  }, [options]);

  return { status, lastEventAt };
}
