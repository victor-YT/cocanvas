import type { CodexTimelineEvent } from "@/lib/types/codex";
import type {
  AcceptanceCriterion,
  Evidence,
  FeatureNode,
  GraphState,
} from "@/lib/types/graph";
import {
  mapPathToFeatureMatch,
  mapTextToFeatureMatches,
  tokenize,
} from "./mapPathToFeature";

const GENERIC_CRITERION_TOKENS = new Set([
  "can",
  "cannot",
  "password",
  "reset",
  "token",
  "user",
]);

function evidenceId(event: CodexTimelineEvent, path?: string) {
  const suffix = path ? `-${path.replace(/[^a-z0-9]/gi, "-")}` : "";
  return `evidence-${event.id}${suffix}`.replace(/-+/g, "-").replace(/-$/, "");
}

function eventEvidence(event: CodexTimelineEvent, path?: string): Evidence {
  return {
    id: evidenceId(event, path),
    type:
      event.type === "plan_updated"
        ? "codex_plan"
        : event.type === "command_started"
          ? "command"
          : event.type === "command_completed" ||
              event.type === "test_failed" ||
              event.type === "test_passed"
            ? "test_result"
            : event.type === "diff_updated"
              ? "diff"
              : "file_path",
    title: event.title,
    detail: event.detail ?? path ?? event.command ?? "Codex event",
    path,
    codexEventId: event.id,
    confidence: 0.8,
  };
}

function appendEvidence(feature: FeatureNode, evidence: Evidence) {
  if (!feature.evidence.some((item) => item.id === evidence.id)) {
    feature.evidence.push(evidence);
  }
}

function upsertDriftNode(graph: GraphState, event: CodexTimelineEvent, path: string) {
  const driftId = `drift-${path.replace(/[^a-z0-9]/gi, "-").toLowerCase()}`;
  const existing = graph.features.find((feature) => feature.id === driftId);
  const evidence = eventEvidence(event, path);

  if (existing) {
    appendEvidence(existing, evidence);
    graph.selectedNodeId = existing.id;
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
  graph.selectedNodeId = driftId;
}

function uniqueFeatures(features: FeatureNode[]) {
  const seen = new Set<string>();
  return features.filter((feature) => {
    if (seen.has(feature.id)) {
      return false;
    }

    seen.add(feature.id);
    return true;
  });
}

function inferRelatedFeatures(graph: GraphState, event: CodexTimelineEvent) {
  const byId = graph.features.filter((feature) =>
    event.featureIds?.includes(feature.id),
  );
  const byPath = (event.paths ?? [])
    .map((path) => mapPathToFeatureMatch(path, graph)?.feature)
    .filter((feature): feature is FeatureNode => Boolean(feature));
  const byText = mapTextToFeatureMatches(
    [event.title, event.detail, event.command].filter(Boolean).join(" "),
    graph,
  ).map((match) => match.feature);

  return uniqueFeatures([...byId, ...byPath, ...byText]);
}

function eventText(event: CodexTimelineEvent) {
  return [event.title, event.detail, event.command, ...(event.paths ?? [])]
    .filter(Boolean)
    .join(" ");
}

function hasTestSignal(event: CodexTimelineEvent) {
  return (
    event.type === "test_passed" ||
    event.type === "test_failed" ||
    /\b(test|tests|jest|vitest|playwright|pytest|spec)\b/i.test(
      event.command ?? event.title,
    )
  );
}

function criterionOverlap(
  criterion: AcceptanceCriterion,
  event: CodexTimelineEvent,
) {
  const criterionTokens = new Set(tokenize(criterion.text));
  return [...new Set(tokenize(eventText(event)))].filter((token) =>
    criterionTokens.has(token),
  );
}

function distinctiveCriterionOverlap(
  criterion: AcceptanceCriterion,
  event: CodexTimelineEvent,
) {
  return criterionOverlap(criterion, event).filter(
    (token) => !GENERIC_CRITERION_TOKENS.has(token),
  );
}

function updateCriteriaFromFileChange(
  feature: FeatureNode,
  event: CodexTimelineEvent,
  evidenceIdForEvent: string,
) {
  feature.acceptanceCriteria = feature.acceptanceCriteria.map((criterion) => {
    const overlap = distinctiveCriterionOverlap(criterion, event);

    if (overlap.length < 1) {
      return criterion;
    }

    return {
      ...criterion,
      status: criterion.status === "verified" ? "verified" : "implemented",
      evidenceIds: [...new Set([...criterion.evidenceIds, evidenceIdForEvent])],
    };
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
      const match = mapPathToFeatureMatch(path, graph);
      const feature = match?.feature;

      if (!feature) {
        upsertDriftNode(graph, event, path);
        continue;
      }

      feature.status = "in_progress";
      const evidence = eventEvidence(event, path);
      appendEvidence(feature, evidence);
      updateCriteriaFromFileChange(feature, event, evidence.id);
      feature.riskSummary = "Code changed. Waiting for test evidence.";
      graph.selectedNodeId = feature.id;
    }
  }

  if (event.type === "diff_updated") {
    for (const feature of inferRelatedFeatures(graph, event)) {
      feature.status = feature.status === "verified" ? "verified" : "in_progress";
      appendEvidence(feature, eventEvidence(event));
      graph.selectedNodeId = feature.id;
    }
  }

  if (event.type === "plan_updated" || event.type === "agent_message") {
    for (const feature of inferRelatedFeatures(graph, event)) {
      appendEvidence(feature, eventEvidence(event));
      graph.selectedNodeId = feature.id;
    }
  }

  if (
    event.type === "command_started" ||
    event.type === "command_completed" ||
    event.type === "test_passed" ||
    event.type === "test_failed"
  ) {
    for (const feature of inferRelatedFeatures(graph, event)) {
      applyCommandResult(feature, event);
      graph.selectedNodeId = feature.id;
    }
  }

  return graph;
}

function applyCommandResult(feature: FeatureNode, event: CodexTimelineEvent) {
  const evidence = eventEvidence(event);
  appendEvidence(feature, evidence);

  if (event.type === "command_started") {
    feature.status = feature.status === "verified" ? "verified" : "in_progress";
    return;
  }

  const isSuccess =
    event.type === "test_passed" ||
    (event.type === "command_completed" && event.exitCode === 0);
  const isFailure =
    event.type === "test_failed" ||
    (event.type === "command_completed" &&
      typeof event.exitCode === "number" &&
      event.exitCode !== 0);

  if (hasTestSignal(event) && isSuccess) {
    feature.status = "verified";
    feature.riskSummary = undefined;
    feature.acceptanceCriteria = feature.acceptanceCriteria.map((criterion) => {
      const overlap = distinctiveCriterionOverlap(criterion, event);
      const isTestCriterion = /\btest\b/i.test(criterion.text);

      if (overlap.length < 1 && !isTestCriterion) {
        return criterion;
      }

      return {
        ...criterion,
        status: "verified",
        evidenceIds: [...new Set([...criterion.evidenceIds, evidence.id])],
      };
    });
    return;
  }

  if (isFailure) {
    feature.status = "risk";
    feature.riskSummary =
      "Related command failed. Review test output before accepting done.";
    feature.acceptanceCriteria = feature.acceptanceCriteria.map((criterion) => {
      const overlap = distinctiveCriterionOverlap(criterion, event);

      if (overlap.length < 1) {
        return criterion;
      }

      return {
        ...criterion,
        status: "risk",
        evidenceIds: [...new Set([...criterion.evidenceIds, evidence.id])],
      };
    });
  }
}
