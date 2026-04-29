# Data Contracts

The main canvas now uses the Observed Feature Graph protocol in
`docs/GRAPH_PROTOCOL.md`.

The primary flow is:

```text
GraphEvent[] -> reduceGraphEvents() -> ObservedGraphState -> canvas
```

Legacy `GraphState` and `CodexTimelineEvent` contracts are kept for older
scaffold code, but new canvas work should use `lib/types/observedGraph.ts`.

## Observed Graph Event

```ts
type GraphEvent =
  | NodeUpsertEvent
  | EdgeUpsertEvent
  | StatusUpdateEvent
  | EvidenceAddEvent
  | RiskAddEvent;
```

## Observed Graph State

```ts
type ObservedGraphState = {
  nodes: ObservedGraphNode[];
  edges: ObservedGraphEdge[];
  selectedNodeId?: string;
  timeline: GraphTimelineItem[];
};
```

## Graph State

```ts
type GraphState = {
  features: FeatureNode[];
  edges: GraphEdge[];
  selectedNodeId?: string;
  timeline: CodexTimelineEvent[];
};
```

## Feature Node

```ts
type FeatureNode = {
  id: string;
  name: string;
  source: "prd" | "repo" | "codex";
  status: "not_started" | "in_progress" | "verified" | "risk" | "drift";
  confidence: number;
  acceptanceCriteria: AcceptanceCriterion[];
  artifacts: ArtifactRef[];
  evidence: Evidence[];
  riskSummary?: string;
};
```

## Codex Event

```ts
type CodexTimelineEvent = {
  id: string;
  type: CodexEventType;
  title: string;
  detail?: string;
  timestamp: string;
  paths?: string[];
  command?: string;
  exitCode?: number;
  featureIds?: string[];
  raw?: unknown;
};
```

## Example JSON

```json
{
  "id": "event-file-1",
  "type": "file_change",
  "title": "Edited src/auth/reset-token.ts",
  "detail": "Added consumed-at guard before accepting a reset token.",
  "timestamp": "2026-04-29T01:00:00.000Z",
  "paths": ["src/auth/reset-token.ts"]
}
```

## API Responses

`POST /api/parse-prd`

```json
{
  "parsed": {
    "title": "Password Reset",
    "sourceText": "Password Reset\n- Reset token cannot be reused.",
    "features": []
  },
  "graph": {
    "features": [],
    "edges": [],
    "timeline": []
  }
}
```

`POST /api/scan-repo`

```json
{
  "repoPath": ".",
  "scannedAt": "2026-04-29T01:00:00.000Z",
  "artifacts": [
    {
      "id": "artifact-src-auth-reset-token-ts",
      "path": "src/auth/reset-token.ts",
      "kind": "service",
      "role": "Business logic",
      "confidence": 0.62,
      "evidence": "Detected by lightweight repository scan."
    }
  ]
}
```

`POST /api/codex/start`

```json
{
  "taskId": "uuid",
  "mode": "mock",
  "repoPath": ".",
  "prompt": "Add protection so reset tokens cannot be reused.",
  "events": [],
  "graphAfterReplay": {
    "features": [],
    "edges": [],
    "timeline": []
  }
}
```

```json
{
  "id": "feature-password-reset",
  "name": "Password Reset",
  "source": "prd",
  "status": "in_progress",
  "confidence": 0.94,
  "artifacts": [
    {
      "id": "artifact-reset-service",
      "path": "src/auth/reset-token.ts",
      "kind": "service",
      "confidence": 0.9,
      "evidence": "Service path directly matches reset token behavior."
    }
  ],
  "evidence": [
    {
      "id": "evidence-event-file-1-src-auth-reset-token-ts",
      "type": "file_path",
      "title": "Edited src/auth/reset-token.ts",
      "detail": "Added consumed-at guard before accepting a reset token."
    }
  ]
}
```
