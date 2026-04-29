# Live Canvas Plugin Demo Script

## Setup

1. Start the web app and backend.
2. Start the Live Canvas MCP server.
3. Confirm the plugin package is present under `plugin/`.
4. Open the canvas and create or select a feature node.

## Narration

1. "This is a Codex-native canvas, not a static repo map."
2. "Each feature node is connected to a Codex thread, branch, or worktree."
3. "The plugin skill tells Codex to update the canvas while it works."
4. "The MCP tools are the bridge: Codex reports status, files, tests, risks, and conflicts."
5. "When I click a node, the follow-up chat gets only this node's context."

## Happy Path

1. Start a task: "Add protection so reset tokens cannot be reused."
2. Codex calls `create_feature_node` or uses the selected node.
3. Node status changes to `planning`.
4. Codex starts editing and calls `update_feature_node` with changed files.
5. Git watcher verifies the changed files.
6. Codex runs tests and calls `mark_test_result`.
7. Codex calls `attach_diff` with the final summary.
8. Node status changes to `done`.

## Conflict Moment

1. Start two tasks that both touch `src/auth/reset-token.ts`.
2. The Git watcher or Codex MCP call emits `mark_conflict`.
3. The canvas draws a conflict edge and raises risk on both nodes.
4. Narrate: "We see the merge risk before review time."

## Node Chat Moment

1. Click the Password Reset node.
2. Ask: "Add a regression test for the reused token case."
3. The backend calls `get_node_context`.
4. Codex receives the original prompt, changed files, test status, risks, and recent messages.
5. Narrate: "The follow-up is scoped to the feature node, not the entire repo."

## Fallback Demo

If MCP is not ready, replay the equivalent backend events:

```bash
curl -X POST "$LIVE_CANVAS_API_URL/api/events" \
  -H "Content-Type: application/json" \
  -d '{"type":"node.status.updated","nodeId":"feature-password-reset","status":"editing"}'
```

Use this line to close:

> Codex can say it is done; cocanvas shows what changed, what passed, what is risky, and which thread owns the work.
