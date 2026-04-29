# Two-Person Plan

## Person A: Canvas & Demo Experience

Owner of product feel, UI layout, canvas readability, timeline, inspector, and demo polish.

Tasks:

1. Replace static graph layout with React Flow.
2. Polish `FeatureNode`, `ArtifactNode`, `GraphLegend`, and status transitions.
3. Improve responsive layout for projector demo.
4. Add small Framer Motion transitions after dependencies are installed.
5. Keep `Run Demo Replay` visually strong.

Success criteria:

- The feature graph is understandable in 5 seconds.
- The demo visibly moves from changed to risk to verified to drift.
- The product feels calm, high-trust, and focused.

## Person B: Graph Intelligence & Codex Events

Owner of types, parser boundary, repo scanner, update logic, adapters, and route handlers.

Tasks:

1. Expand `mockParsePrd` into structured parsing.
2. Improve `mockRepoScan` and then add real filesystem scanning.
3. Harden `mapPathToFeature` with path matching heuristics.
4. Normalize real `codex exec --json` output.
5. Add zod validation once dependencies are installed.
6. Keep all emitted events in `CodexTimelineEvent` format.

Success criteria:

- PRD plus repo artifacts produce graph JSON.
- Codex-like events update feature states predictably.
- Command results mark risk or verification.
- UI never needs to know which adapter produced an event.

## Integration Milestones

1. Mock event `src/auth/reset-token.ts` marks Password Reset `in_progress`.
2. Mock passing test marks Password Reset `verified`.
3. Mock unrelated file creates a purple `drift` node.
4. API routes return the same contracts used by local mock state.
5. Real `codex exec --json` adapter emits at least file and command events.

## Risk Management

- Do not build a database.
- Do not chase perfect parsing.
- Do not build multi-repo support.
- Use mock replay as the default demo path.
- Keep UI and adapter contracts stable.

## Fallback Demo Plan

If live Codex integration fails, use `Run Demo Replay`. It demonstrates plan, file edit, test failure, patch, passing test, and drift without network or external process dependencies.
