# Graph Protocol

## Product Rule

cocanvas renders an Observed Feature Graph.

The canvas is not generated from a user PRD and it is not a code dependency graph. A user task only provides context for the current Codex run. Canvas nodes come from graph events observed during the run.

Core pipeline:

```text
GraphEvent[] -> reduceGraphEvents() -> ObservedGraphState -> canvas
```

## JSONL Source

The MVP source file is:

```text
.cocanvas/graph-events.jsonl
```

Each line is one JSON object. The file is append-only. Do not write one large JSON array and do not overwrite the whole file during a run.

## Event Types

Only these event types drive the canvas:

- `node.upsert`
- `edge.upsert`
- `status.update`
- `evidence.add`
- `risk.add`

## Node Types

- `feature`
- `flow`
- `capability`
- `evidence`
- `risk`
- `cluster`

## Node Statuses

- `planned`
- `building`
- `implemented`
- `needs_evidence`
- `verified`
- `risk`
- `unlinked`

## Edge Relations

- `contains`
- `supports`
- `blocks`
- `enables`
- `related`

## Reducer Rules

`node.upsert`

- Create the node if it does not exist.
- Merge updates if it already exists.

`edge.upsert`

- Create the edge if it does not exist.
- Merge updates if it already exists.

`status.update`

- Find the target node.
- Update status and optional summary.
- Add the raw event to the target node.

`evidence.add`

- Create an evidence node.
- Create a `supports` edge from evidence to target.
- Add the evidence item to the target node.
- Add the evidence path to target related files when present.

`risk.add`

- Create a risk node.
- Create a `blocks` edge from risk to target.
- Add the risk item to the target node.
- Mark the target node as `risk`.

## API

- `GET /api/graph` returns `{ events, graph }`.
- `GET /api/events` returns `{ events, timeline }`.
- `POST /api/demo/replay` returns mock events and reduced graph.
- `POST /api/graph/reset` returns an empty graph.

## Implementation Files

- `lib/types/observedGraph.ts`
- `lib/graph/reduceGraphEvents.ts`
- `lib/graph/readGraphEvents.ts`
- `lib/demo/mockGraphEvents.ts`
- `.cocanvas/graph-events.jsonl`

Legacy PRD and repo scanner files are still present, but they do not drive the main canvas.
