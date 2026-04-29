# Two-Person Plan

## Person A: Canvas and Demo Feel

Owner of the visible product experience.

Tasks:

1. Polish the React Flow canvas, node cards, zoom behavior, and animations.
2. Keep the page focused on the white dotted canvas.
3. Improve the Codex input panel as a believable task entry surface.
4. Tune mock replay pacing and visual states.
5. Validate the demo as a skeptical user and flag confusing behavior quickly.

Success criteria:

- The graph is understandable in a few seconds.
- Nodes appear, change status, and connect without visual clutter.
- The product feels like a focused builder tool, not a generic dashboard.

## Person B: Graph Events and Integration

Owner of the protocol, reducer, observer boundary, and API surface.

Tasks:

1. Keep `GraphEvent[] -> reduceGraphEvents() -> ObservedGraphState` stable.
2. Add validation for each JSONL graph event.
3. Build the `codex exec --json` or Codex SDK adapter behind the same graph-event boundary.
4. Add an observer step that turns Codex events, file changes, diffs, and test output into graph events.
5. Keep mock replay working as the fallback demo path.

Success criteria:

- The frontend never knows whether events came from mock replay, Codex CLI, Codex SDK, or an observer model.
- Invalid graph events are rejected or ignored without breaking the canvas.
- Real Codex activity can produce at least node, evidence, risk, and status events.

## Milestones

1. Mock replay grows the observed feature graph.
2. Reducer handles all five event types predictably.
3. JSONL file loading works from `.cocanvas/graph-events.jsonl`.
4. Live adapter appends graph events without replacing the whole graph.
5. Observer model emits the same protocol from Codex activity.

## Fallback

`Run Demo` remains the primary fallback. It must work without credentials, a database, a running Codex process, or a network call.
