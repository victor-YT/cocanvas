# Data Contracts

The main canvas uses the Observed Feature Graph protocol from `lib/types/observedGraph.ts`.

## Flow

```text
GraphEvent[] -> reduceGraphEvents() -> ObservedGraphState -> React Flow
```

## Graph Event

```ts
type GraphEvent =
  | NodeUpsertEvent
  | EdgeUpsertEvent
  | StatusUpdateEvent
  | EvidenceAddEvent
  | RiskAddEvent;
```

## Node Types

```ts
type ObservedNodeType =
  | "feature"
  | "flow"
  | "capability"
  | "evidence"
  | "risk"
  | "cluster";
```

## Node Statuses

```ts
type ObservedNodeStatus =
  | "planned"
  | "building"
  | "implemented"
  | "needs_evidence"
  | "verified"
  | "risk"
  | "unlinked";
```

## Edge Relations

```ts
type ObservedEdgeRelation =
  | "contains"
  | "supports"
  | "blocks"
  | "enables"
  | "related";
```

## Graph State

```ts
type ObservedGraphState = {
  nodes: ObservedGraphNode[];
  edges: ObservedGraphEdge[];
  selectedNodeId?: string;
  timeline: GraphTimelineItem[];
};
```

## Example Event

```json
{
  "type": "evidence.add",
  "targetId": "server_actions",
  "evidence": {
    "id": "server_actions_tests_passed",
    "kind": "test",
    "summary": "Task mutation tests passed.",
    "path": "tests/tasks.test.ts"
  }
}
```

The reducer creates an evidence node and a `supports` edge from the evidence node to the target.

## Current API Responses

`GET /api/graph`

```json
{
  "events": [],
  "graph": {
    "nodes": [],
    "edges": [],
    "timeline": []
  }
}
```

`POST /api/demo/replay`

```json
{
  "events": [],
  "graph": {
    "nodes": [],
    "edges": [],
    "timeline": []
  }
}
```
