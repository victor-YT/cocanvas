# Person A: Canvas and Demo Experience

## Ownership

Person A owns the visible product experience:

- App shell and page composition
- Feature canvas
- Feature and artifact node design
- Timeline panel
- Bottom inspector
- Demo replay polish
- Responsive layout
- Visual status language

## Primary Files

- `components/layout/*`
- `components/graph/*`
- `components/timeline/*`
- `components/inspector/*`
- `components/prd/*`
- `components/codex/*`
- `app/page.tsx`
- `app/globals.css`

Avoid editing `lib/graph`, `lib/codex`, `lib/repo`, or API routes unless Person B agrees.

## First Goals

1. Make the current static canvas feel polished and easy to understand.
2. Replace the static graph layout with React Flow when dependencies are added.
3. Improve node status transitions for `in_progress`, `verified`, `risk`, and `drift`.
4. Make `Run Demo Replay` look strong on a projector.
5. Keep the interface calm, clean, and product-focused.

## Success Criteria

- A viewer understands the graph in 5 seconds.
- The Password Reset path is visually obvious.
- Yellow means Codex touched implementation.
- Green means evidence or tests passed.
- Red means missing evidence or failure.
- Purple means out-of-scope drift.
- The demo still works if real Codex integration is unavailable.

## Guardrails

- Do not build a landing page.
- Do not add auth, billing, or database UI.
- Do not make a dense dependency graph.
- Keep copy minimal and direct.
- Preserve the shared data contracts.
- Coordinate before changing event or graph types.

## Recommended Next Tasks

1. Install and wire React Flow.
2. Convert `FeatureCanvas` into real nodes and edges.
3. Add subtle animated status changes.
4. Improve the inspector layout for selected feature details.
5. Add empty and loading states for demo replay.
6. Polish mobile and laptop viewport behavior.

## Demo Checklist

- Start on the initial graph.
- Click `Run Demo Replay`.
- Confirm Password Reset becomes changed.
- Confirm failed test creates risk.
- Confirm passing test creates verified.
- Confirm billing edit creates drift.
- Confirm inspector shows evidence for the selected node.
