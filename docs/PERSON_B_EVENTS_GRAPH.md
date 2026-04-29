# Person B: Events and Graph Intelligence

## Ownership

Person B owns the logic behind the product experience:

- Shared TypeScript contracts
- PRD parser boundary
- Repo scanner boundary
- Feature graph construction
- Path-to-feature mapping
- Codex event normalization
- Graph update rules
- API route skeletons
- Future `codex exec --json` integration

## Primary Files

- `lib/types/*`
- `lib/demo/*`
- `lib/graph/*`
- `lib/prd/*`
- `lib/repo/*`
- `lib/codex/*`
- `lib/state/*`
- `app/api/*`
- `docs/DATA_CONTRACTS.md`
- `docs/ARCHITECTURE.md`

Avoid changing visual components unless Person A asks for contract support.

## First Goals

1. Keep `CodexTimelineEvent` stable.
2. Improve `mapPathToFeature` beyond exact path matching.
3. Expand `updateGraphFromCodexEvent` while keeping rules readable.
4. Make mock API routes return useful scaffold data.
5. Start the `codex exec --json` adapter only after mock replay remains stable.

## Success Criteria

- A `file_change` event for `src/auth/reset-token.ts` marks Password Reset `in_progress`.
- A passing test command marks Password Reset `verified`.
- A failing test command marks Password Reset `risk`.
- An unmapped file change creates a `drift` node.
- The UI consumes graph state without knowing the event source.

## Guardrails

- Do not build a production database.
- Do not overbuild PRD parsing.
- Do not add full static analysis.
- Do not change UI status semantics without coordinating with Person A.
- Keep adapters behind `CodexEventSource`.
- Keep mock replay working at all times.

## Recommended Next Tasks

1. Add zod schemas for incoming API payloads.
2. Add path matching by basename and feature keywords.
3. Add richer evidence IDs and event references.
4. Add repo scan heuristics for tests, API routes, services, and UI files.
5. Implement JSONL parsing for `codex exec --json`.
6. Add a route or server-sent stream for normalized events.

## Demo Checklist

- Mock events still replay in order.
- Event timestamps are fresh during replay.
- Password Reset gets file-change evidence.
- Test failure is visible as risk.
- Test pass is visible as verification.
- Drift node is created for `src/billing/subscription.ts`.
