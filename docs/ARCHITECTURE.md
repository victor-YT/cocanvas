# Architecture

## Current Shape

cocanvas is currently a small Next.js app centered on one path:

```text
.cocanvas/graph-events.jsonl or mockGraphEvents
  -> readGraphEvents()
  -> reduceGraphEvents()
  -> ObservedGraphState
  -> React Flow canvas
```

The canvas does not parse a PRD and does not draw a code dependency graph. It renders an observed feature graph from graph events.

## Runtime Pieces

- `app/page.tsx` renders the app shell.
- `components/layout/AppShell.tsx` owns local replay state and top-level actions.
- `components/graph/FeatureCanvas.tsx` renders nodes and edges with React Flow.
- `components/codex/CodexChatPanel.tsx` is the UI placeholder for future Codex task entry.
- `lib/types/observedGraph.ts` defines the graph event protocol.
- `lib/graph/reduceGraphEvents.ts` reduces append-only events into canvas state.
- `lib/demo/mockGraphEvents.ts` provides the hackathon fallback replay.

## API Routes

- `GET /api/graph` reads graph events and returns `{ events, graph }`.
- `GET /api/events` reads graph events and returns `{ events, timeline }`.
- `POST /api/demo/replay` returns the scripted mock graph events and reduced graph.
- `POST /api/graph/reset` returns an empty graph state.

## Event Strategy

The stable contract is append-only graph events:

```text
node.upsert
edge.upsert
status.update
evidence.add
risk.add
```

Any observer can emit these events later: mock replay, `codex exec --json`, Codex SDK, App Server, repo watcher, or an OpenAI Responses-based observer. The UI should only consume reduced graph state.

## Codex Integration Status

The current app is not connected to live Codex. The input panel is a UI placeholder. The next integration should add a server-side adapter that either:

1. Runs `codex exec --json` and maps JSONL events into graph events.
2. Uses the Codex SDK/App Server when the team wants cloud or app-level task control.
3. Uses the OpenAI Responses API for an observer model that converts logs and diffs into graph events.

## Why Mock-First

The demo must work without credentials, network, or a live Codex process. Mock replay proves the product behavior while keeping the integration surface small and replaceable.
