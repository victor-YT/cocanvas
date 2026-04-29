# Person B: Events and Graph Intelligence

## Ownership

Person B owns the observed graph contract and every backend path that produces it:

- `GraphEvent` types
- JSONL reading and validation
- `reduceGraphEvents`
- mock replay data
- graph API routes
- future Codex CLI, Codex SDK, App Server, or observer-model adapters

## Primary Files

- `lib/types/observedGraph.ts`
- `lib/graph/reduceGraphEvents.ts`
- `lib/graph/readGraphEvents.ts`
- `lib/demo/mockGraphEvents.ts`
- `lib/state/graphStore.ts`
- `app/api/graph/route.ts`
- `app/api/events/route.ts`
- `app/api/demo/replay/route.ts`
- `app/api/graph/reset/route.ts`

Avoid changing canvas visuals unless Person A needs a contract change.

## First Goals

1. Keep `GraphEvent[] -> reduceGraphEvents() -> ObservedGraphState` stable.
2. Add runtime validation for every graph event line.
3. Make `.cocanvas/graph-events.jsonl` append-only and safe to read.
4. Build a live adapter that emits the same five graph event types.
5. Keep `Run Demo` working as the fallback path at all times.

## Event Types

Only these event types should reach the canvas:

1. `node.upsert`
2. `edge.upsert`
3. `status.update`
4. `evidence.add`
5. `risk.add`

## Integration Plan

The safest live path is:

```text
Codex activity
  -> observer or adapter
  -> append graph event JSONL
  -> reduceGraphEvents()
  -> canvas
```

The input source can be `codex exec --json`, Codex SDK, App Server, local file watching, or an OpenAI observer model. The frontend should not care which one produced the graph event.

## Success Criteria

- A graph event can create a feature node.
- Evidence creates an evidence node and a `supports` edge.
- Risk creates a risk node and a `blocks` edge.
- Status updates recolor the target node.
- Unlinked work appears as a purple cluster node.

## Guardrails

- Do not rebuild the old PRD parser path.
- Do not add a database for the hackathon demo.
- Do not replace the whole graph file; append JSONL lines.
- Do not let raw Codex output leak directly into React Flow.
- Do not break mock replay while adding live integration.
