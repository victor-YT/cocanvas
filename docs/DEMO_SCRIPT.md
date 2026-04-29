# Demo Script

## Storyline

1. "We paste a PRD."
2. "cocanvas extracts product features."
3. "We ask Codex to implement one feature."
4. "As Codex works, the feature graph grows."
5. "This yellow node means Codex touched the service implementation."
6. "This green node means tests passed."
7. "This red node means an acceptance criterion lacks evidence."
8. "This purple node means Codex changed something outside the PRD."
9. "Codex says done. cocanvas shows whether done is actually backed by evidence."

## Sample PRD

```text
Password Reset

- User can request a reset email.
- Reset token expires after 15 minutes.
- Reset token cannot be reused.
- Invalid token shows a clear error.
- There is a test for token reuse.
```

## Sample Codex Task

```text
Add protection so reset tokens cannot be reused.
```

## Expected UI Transitions

1. Initial graph shows Auth and Password Reset.
2. Plan event appears in the timeline.
3. `src/auth/reset-token.ts` turns Password Reset yellow.
4. First test command fails and Password Reset becomes red.
5. Patch event adds more evidence.
6. Passing test command turns Password Reset green.
7. `src/billing/subscription.ts` creates a purple drift node.

## Final Pitch Line

Codex can say "done"; cocanvas shows whether done is backed by product evidence.
