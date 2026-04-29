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
5. Use the Codex input panel to start a real Codex App Server task.

## Setup

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

Copy `.env.example` to `.env` and set `OPENAI_API_KEY` for live Codex and observer runs.

## Mock Demo

Click `Run Demo Replay`.

The replay emits append-only graph events. The graph updates without any live Codex integration.

## Live Codex Mode

The Codex input panel calls `/api/codex/start`, starts `codex app-server`,
authenticates with `OPENAI_API_KEY`, and runs the task in the selected repo.
After Codex completes, cocanvas sends the raw Codex events to an OpenAI
Responses observer model and converts the result into the same graph event
protocol used by the mock replay. Returned graph events are also appended to
`.cocanvas/graph-events.jsonl` in the selected repo.

## Tech Stack

- Next.js
- React
- TypeScript
- Tailwind CSS
- React Flow
- Codex App Server
- OpenAI Responses observer
- Mock-first graph event replay fallback

## Current Limitations

- The canvas reads graph events, not raw Codex output.
- The live observer falls back to adapter-derived graph events if OpenAI observation fails.
- State in the browser is local; graph events are append-only JSONL on disk.

## Future Work

- Normalize real `codex exec --json` output into graph events.
- Add a full Codex SDK path if it becomes available for this workflow.
- Add graph snapshots.
- Add validation for `.cocanvas/graph-events.jsonl`.
