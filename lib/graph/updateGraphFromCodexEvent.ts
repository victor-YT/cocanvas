import type { CodexTimelineEvent } from "@/lib/types/codex";
import type { Evidence, FeatureNode, GraphState } from "@/lib/types/graph";
import { mapPathToFeature } from "./mapPathToFeature";

function eventEvidence(event: CodexTimelineEvent, path?: string): Evidence {
  return {
    id: `evidence-${event.id}${path ? `-${path.replace(/[^a-z0-9]/gi, "-")}` : ""}`,
    type:
      event.type === "plan_updated"
        ? "codex_plan"
        : event.type === "command_completed"
          ? "test_result"
          : "file_path",
    title: event.title,
    detail: event.detail ?? path ?? event.command ?? "Codex event",
    path,
    codexEventId: event.id,
    confidence: 0.8,
  };
}

function upsertDriftNode(graph: GraphState, event: CodexTimelineEvent, path: string) {
  const driftId = `drift-${path.replace(/[^a-z0-9]/gi, "-").toLowerCase()}`;
  const existing = graph.features.find((feature) => feature.id === driftId);
  const evidence = eventEvidence(event, path);

  if (existing) {
    existing.evidence.push(evidence);
    return;
  }

  graph.features.push({
    id: driftId,
    name: "Out-of-scope change",
    description: path,
    source: "codex",
    status: "drift",
    confidence: 0.7,
    riskSummary: "Codex touched a file that does not map to the PRD feature graph.",
    acceptanceCriteria: [],
    artifacts: [
      {
        id: `artifact-${driftId}`,
        path,
        kind: "unknown",
        role: "Unexpected change",
        confidence: 0.7,
        evidence: event.title,
      },
    ],
    evidence: [evidence],
  });
}

export function updateGraphFromCodexEvent(
  current: GraphState,
  event: CodexTimelineEvent,
): GraphState {
  const graph: GraphState = structuredClone(current);
  graph.timeline = [event, ...graph.timeline];

  if (event.type === "file_change") {
    for (const path of event.paths ?? []) {
      const feature = mapPathToFeature(path, graph);

      if (!feature) {
        upsertDriftNode(graph, event, path);
        continue;
      }

      feature.status = "in_progress";
      feature.evidence.push(eventEvidence(event, path));
      feature.riskSummary = "Code changed. Waiting for test evidence.";
      graph.selectedNodeId = feature.id;
    }
  }

  if (event.type === "plan_updated") {
    for (const feature of graph.features) {
      if (event.featureIds?.includes(feature.id)) {
        feature.evidence.push(eventEvidence(event));
      }
    }
  }

  if (event.type === "command_completed") {
    const relatedFeatures = graph.features.filter((feature) =>
      event.featureIds?.includes(feature.id),
    );

    for (const feature of relatedFeatures) {
      applyCommandResult(feature, event);
      graph.selectedNodeId = feature.id;
    }
  }

  return graph;
}

function applyCommandResult(feature: FeatureNode, event: CodexTimelineEvent) {
  feature.evidence.push(eventEvidence(event));

  if (event.command?.includes("test") && event.exitCode === 0) {
    feature.status = "verified";
    feature.riskSummary = undefined;
    feature.acceptanceCriteria = feature.acceptanceCriteria.map((criterion) =>
      criterion.status === "missing_evidence" || criterion.id.includes("reuse")
        ? { ...criterion, status: "verified", evidenceIds: [...criterion.evidenceIds, `evidence-${event.id}`] }
        : criterion,
    );
    return;
  }

  if (event.exitCode && event.exitCode !== 0) {
    feature.status = "risk";
    feature.riskSummary = "Related command failed. Review test output before accepting done.";
  }
}
