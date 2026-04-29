# cocanvas

Live observed feature canvas for Codex-heavy builders.

cocanvas turns Codex activity into an observed product feature graph that shows what was built, what has evidence, and what looks risky.

## User Problem

Codex can move faster than the user can review. Builders need a calm surface that shows observed feature changes, evidence, risk, and drift without reading every intermediate file edit.

## Demo Flow

1. Open the canvas.
2. Run the demo replay.
3. Watch graph events create feature, flow, capability, evidence, risk, and cluster nodes.
4. Watch statuses move through building, implemented, risk, verified, and unlinked.
5. Use the Codex input panel as the future task entry point.

## Setup

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

No environment variables are required for the current mock demo.

## Mock Demo

Click `Run Demo Replay`.

The replay emits append-only graph events. The graph updates without any live Codex integration.

## Tech Stack

- Next.js
- React
- TypeScript
- Tailwind CSS
- React Flow
- Mock-first graph event replay

Planned additions: graph event validation, `codex exec --json`, Codex SDK/App Server integration, and an OpenAI observer model.

## Current Limitations

- The input panel does not start a real Codex task yet.
- The observer model is not wired yet.
- The canvas reads graph events, not raw Codex output.
- State is local and in-memory.

## Future Work

- Normalize real `codex exec --json` output into graph events.
- Add a Codex SDK or App Server path.
- Add an OpenAI observer that converts diffs, tests, and logs into graph events.
- Persist graph events and snapshots.
- Add validation for `.cocanvas/graph-events.jsonl`.
