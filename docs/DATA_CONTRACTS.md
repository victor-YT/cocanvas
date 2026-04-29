# Data Contracts

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
