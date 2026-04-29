# Codex Live Canvas MCP Server

Thread 3 owns this folder.

This server exposes the Live Canvas tools Codex uses to report feature-node progress:

- `create_feature_node`
- `update_feature_node`
- `attach_diff`
- `mark_test_result`
- `mark_conflict`
- `get_node_context`

It speaks MCP over stdio and forwards tool calls to the Live Canvas backend.

## Run

```bash
npm --prefix mcp-server run build
node mcp-server/dist/index.js
```

Set `LIVE_CANVAS_API_URL` if the backend is not running on `http://localhost:4000`.

For a local smoke test without a backend:

```bash
LIVE_CANVAS_OFFLINE=1 node mcp-server/dist/index.js
```
