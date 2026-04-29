import type { ArtifactKind, FeatureStatus, GraphState } from "@/lib/types/graph";
import type { CodexTimelineEvent } from "@/lib/types/codex";
import type { GraphEvent, ObservedNodeStatus } from "@/lib/types/observedGraph";

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

export type BackendFeatureNode = {
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

export type BackendCanvasEvent = {
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

export type BackendGraphSnapshot = {
  nodes: BackendFeatureNode[];
  events: BackendCanvasEvent[];
  conflicts: BackendCanvasEvent[];
};

export type BackendNodeFilter = (node: BackendFeatureNode) => boolean;

export function isBackendCanvasEvent(payload: unknown): payload is BackendCanvasEvent {
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

function mapBackendObservedStatus(
  status: BackendFeatureStatus,
  riskLevel: BackendRiskLevel,
): ObservedNodeStatus {
  if (riskLevel === "high" || status === "blocked" || status === "failed") {
    return "risk";
  }

  if (status === "done") {
    return "verified";
  }

  if (status === "planning" || status === "editing" || status === "testing") {
    return "building";
  }

  return "planned";
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

function eventSafeId(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function backendEventToTimeline(event: BackendCanvasEvent): CodexTimelineEvent {
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
    paths: event.filePath ? [event.filePath] : event.changedFiles ?? event.files,
    command: event.command,
    featureIds: event.nodeId ? [event.nodeId] : event.nodeIds,
    exitCode:
      event.type === "test.updated" ? (event.testStatus === "failed" ? 1 : 0) : undefined,
    raw: event,
  };
}

export function backendSnapshotToGraphEvents(
  snapshot: BackendGraphSnapshot,
  filterNode: BackendNodeFilter = () => true,
): GraphEvent[] {
  const events: GraphEvent[] = [];

  const includedNodeIds = new Set<string>();

  snapshot.nodes.filter(filterNode).forEach((node) => {
    includedNodeIds.add(node.id);
    events.push({
      type: "node.upsert",
      node: {
        id: node.id,
        nodeType: "feature",
        title: node.title,
        status: mapBackendObservedStatus(node.status, node.riskLevel),
        summary: node.summary ?? node.description ?? node.originalPrompt,
        confidence: 0.9,
        relatedFiles: node.changedFiles,
      },
    });

    events.push({
      type: "evidence.add",
      targetId: node.id,
      evidence: {
        id: `${node.id}_prompt`,
        kind: "plan",
        summary: node.originalPrompt,
      },
    });

    node.changedFiles.forEach((file) => {
      events.push({
        type: "evidence.add",
        targetId: node.id,
        evidence: {
          id: `${node.id}_${eventSafeId(file)}_file`,
          kind: "file",
          summary: `Changed ${file}`,
          path: file,
        },
      });
    });

    if (node.diffSummary) {
      events.push({
        type: "evidence.add",
        targetId: node.id,
        evidence: {
          id: `${node.id}_diff`,
          kind: "diff",
          summary: node.diffSummary,
        },
      });
    }

    if (node.testCommand) {
      events.push({
        type: "evidence.add",
        targetId: node.id,
        evidence: {
          id: `${node.id}_test_${eventSafeId(node.testCommand)}`,
          kind: "test",
          summary: node.testOutputSummary ?? `${node.testCommand}: ${node.testStatus}`,
        },
      });
    }

    node.riskReasons.forEach((reason, index) => {
      events.push({
        type: "risk.add",
        targetId: node.id,
        risk: {
          id: `${node.id}_risk_${index}`,
          severity: node.riskLevel,
          summary: reason,
        },
      });
    });
  });

  snapshot.conflicts.forEach((conflict) => {
    const [from, to] = conflict.nodeIds ?? [];

    if (!from || !to || !includedNodeIds.has(from) || !includedNodeIds.has(to)) {
      return;
    }

    events.push({
      type: "edge.upsert",
      edge: {
        id: conflict.id,
        from,
        to,
        relation: "contains",
        label: conflict.reason ?? "conflict",
      },
    });
  });

  return events;
}

export function backendSnapshotToGraph(snapshot: BackendGraphSnapshot): GraphState {
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
