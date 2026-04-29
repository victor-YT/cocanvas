# Architecture

## High-Level Architecture

cocanvas is a single full-stack TypeScript app:

- `app/`: Next.js pages and route handlers.
- `components/`: UI shell, graph, timeline, inspector, PRD, and Codex task panels.
- `lib/types/`: shared data contracts.
- `lib/prd/`: PRD parser boundary.
- `lib/repo/`: repo scan and watcher boundary.
- `lib/codex/`: event source adapters.
- `lib/graph/`: graph construction and event update logic.
- `lib/demo/`: mock PRD, graph, and Codex event sequence.

## Event Flow

1. User starts a task.
2. A `CodexEventSource` emits normalized `CodexTimelineEvent` records.
3. UI appends each event to the timeline.
4. `updateGraphFromCodexEvent` maps events to features and evidence.
5. Canvas and inspector rerender from the graph state.

## Graph Update Flow

- `file_change` maps changed paths to feature artifacts.
- Matched features become `in_progress`.
- Unmapped file changes create `drift` nodes.
- Passing test commands mark related features `verified`.
- Failing commands mark related features `risk`.

## Adapter Strategy

Every event source implements:

```ts
startTask(input: { repoPath: string; prompt: string }): AsyncIterable<CodexTimelineEvent>
```

This keeps the UI independent from mock replay, `codex exec --json`, repo watchers, or future Codex App Server integration.

## Why Mock-First Is Intentional

The hackathon demo needs one strong path even if live integration breaks. Mock replay proves the product loop, gives Person A stable UI data, and gives Person B a contract for real event normalization.
