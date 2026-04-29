# cocanvas

Live feature canvas for Codex-heavy builders.

cocanvas turns a PRD plus Codex activity into a product feature graph that shows what changed, why it changed, and whether the change is backed by evidence.

## User Problem

Codex can move faster than the user can review. Builders need a PRD-aware surface that highlights partial implementation, unrelated edits, missing tests, risky claims, and verified work.

## Demo Flow

1. Select a repo.
2. Paste the Password Reset PRD.
3. Generate the initial feature graph.
4. Start a Codex task.
5. Replay Codex events.
6. Watch feature nodes move through changed, risk, verified, and drift states.
7. Inspect evidence and suggested actions.

## Setup

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Mock Demo

Click `Run Demo Replay`.

The replay emits plan updates, file changes, test failure, test pass, and an out-of-scope billing edit. The graph updates without any live Codex integration.

## Tech Stack

- Next.js
- React
- TypeScript
- Tailwind CSS
- Mock-first Codex event adapter

Planned additions: React Flow, Framer Motion, Zustand, zod, chokidar, simple-git, and `codex exec --json`.

## Current Limitations

- PRD parsing is mocked.
- Repo scanning is mocked.
- Canvas layout is static.
- Codex adapters are placeholders except mock replay.
- State is local and in-memory.

## Future Work

- Replace static canvas with React Flow.
- Add structured OpenAI PRD parsing.
- Normalize real `codex exec --json` events.
- Add repo watcher and git checkpoint support.
- Persist graph snapshots as JSON.
