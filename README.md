# VIDEO

https://drive.google.com/file/d/1969XOsfROHzdc4GJHbtecgy2mpv5RkH_/view?usp=sharing



# cocanvas

cocanvas is a live feature canvas for Codex-heavy builders. It turns Codex activity, repository scans, and observer output into an observed product graph that shows what was built, what evidence supports it, and where risk remains.

## Why It Exists

Codex can move faster than a user can review. cocanvas gives builders a calmer product-level audit trail so they can understand feature changes without reading every intermediate file edit.

The core idea is simple: Codex writes code in files, but builders reason about product features. cocanvas connects file-level activity back to feature-level intent.

## What It Does

- Renders an observed feature graph with React Flow.
- Tracks feature, flow, capability, evidence, risk, and cluster nodes.
- Shows status changes such as building, implemented, verified, risk, and unlinked.
- Replays mock graph events for demos without credentials or network access.
- Imports a selected repository into a saved `.cocanvas/graph-events.jsonl` feature map.
- Provides a Codex input panel for live App Server runs and observer-based graph updates.

## Getting Started

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open `http://localhost:3000`.

For live Codex and OpenAI observer runs, copy `.env.example` to `.env` and set:

```bash
OPENAI_API_KEY=your_api_key_here
```

## Demo Flow

1. Open the app.
2. Click `Run Demo Replay`.
3. Watch graph events create and connect product features.
4. Inspect evidence, risk, and status changes as they appear.
5. Select a real repo and ask Codex to perform a task from the input panel.

## How It Works

cocanvas uses an append-only graph event protocol:

```text
node.upsert
edge.upsert
status.update
evidence.add
risk.add
```

Those events are reduced into an observed graph state and rendered on the canvas. The same protocol can be produced by mock replay, repository import, Codex App Server output, or an OpenAI Responses observer.

Current runtime path:

```text
.cocanvas/graph-events.jsonl or mockGraphEvents
  -> readGraphEvents()
  -> reduceGraphEvents()
  -> ObservedGraphState
  -> React Flow canvas
```

## Project Structure

```text
app/                         Next.js app routes and API routes
components/layout/           Top-level app shell
components/graph/            Feature canvas UI
components/codex/            Codex task input and run status UI
lib/graph/                   Graph event read/write/reduce helpers
lib/repo/                    Repository scanning and graph inference
lib/observer/                OpenAI observer adapters
lib/types/                   Shared observed graph types
lib/demo/                    Mock demo event stream
docs/                        Product, architecture, and protocol notes
```

## Scripts

```bash
npm run dev      # start local development
npm run build    # build for production
npm run start    # start the production server
npm run lint     # run ESLint
```

## Tech Stack

- Next.js
- React
- TypeScript
- Tailwind CSS
- React Flow
- Codex App Server
- OpenAI Responses observer

## Current Limitations

- The canvas consumes graph events rather than raw Codex output.
- The live observer can fall back to adapter-derived graph events if OpenAI observation fails.
- Browser state is local; durable graph history is stored as append-only JSONL on disk.
- The project is an MVP prototype, not a production multi-user system.

## Future Work

- Normalize `codex exec --json` output into graph events.
- Add graph snapshots.
- Add validation for `.cocanvas/graph-events.jsonl`.
- Expand the live Codex SDK/App Server integration path.
