---
name: live-canvas-sync
description: Use when working in a repository connected to Codex Live Canvas and you need to keep feature nodes, diffs, tests, risks, conflicts, and node-scoped follow-up context updated through the live canvas MCP tools.
---

# Live Canvas Sync

Use this skill when a Codex task is attached to a Codex Live Canvas feature node.

## Goal

Keep the canvas useful for a developer watching several Codex threads at once. Report status, changed files, tests, risks, and final summaries through the Live Canvas MCP tools without leaking secrets or dumping large source excerpts.

## Start Of Task

1. Identify the active `nodeId` from the prompt, branch, worktree, or `get_node_context`.
2. If there is no matching node, call `create_feature_node` with a concise title, the original prompt, and the current thread id when available.
3. Call `update_feature_node` with `status: "planning"` and a short summary of the intended work.
4. If continuing a node chat, call `get_node_context` before reading broad repo context.

## While Editing

1. Call `update_feature_node` with `status: "editing"` once files are being changed.
2. Report changed files as paths, not full file contents.
3. Mark risk as `medium` when touching shared infrastructure, generated files, package metadata, config, or files outside the feature's expected area.
4. Mark risk as `high` when a change may break another active thread, blocks tests, or creates an unresolved product ambiguity.
5. If another active node owns the same file, call `mark_conflict` with both node ids, the overlapping files, and the reason.

## Tests

1. Before running a test command, call `mark_test_result` with `status: "running"`.
2. After the command finishes, call `mark_test_result` with `status: "passed"` or `status: "failed"`.
3. Summarize failures briefly. Include the command and the failing area, not long logs.
4. If tests cannot be run, call `update_feature_node` with a risk reason explaining why.

## Finish

1. Call `attach_diff` with the final changed files and a concise human-readable diff summary.
2. Call `update_feature_node` with `status: "done"` when implementation and verification are complete.
3. Use `status: "blocked"` when the task needs user input or another thread's work.
4. Use `status: "failed"` only when the task cannot be completed in the current thread.
5. Final summaries should match the canvas state: files changed, tests run, risks, and next actions.

## Tool Payload Shape

Use these tools when available:

- `create_feature_node({ title, description?, originalPrompt, threadId? })`
- `update_feature_node({ nodeId, status?, summary?, changedFiles?, riskLevel?, riskReasons? })`
- `attach_diff({ nodeId, changedFiles, diffSummary })`
- `mark_test_result({ nodeId, command, status, outputSummary? })`
- `mark_conflict({ nodeIds, files, reason })`
- `get_node_context({ nodeId })`

## Reporting Rules

- Keep canvas updates short, concrete, and reviewer-friendly.
- Prefer repo-relative paths.
- Never include secrets, tokens, credentials, `.env` contents, or private user data.
- Avoid full source snippets unless the user explicitly asks for them in chat.
- Do not mark a node done if tests are failing or the implementation is knowingly incomplete.
- If the MCP server is unavailable, keep a local note of intended canvas updates and include them in the final response.
