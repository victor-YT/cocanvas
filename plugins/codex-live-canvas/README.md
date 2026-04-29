# Codex Live Canvas Plugin

Codex Live Canvas packages the Codex-facing side of cocanvas: a sync skill plus MCP server configuration for updating live feature nodes while Codex works.

## Contents

- `.codex-plugin/plugin.json`: Codex plugin manifest.
- `.mcp.json`: MCP server launch/config contract for the canvas tools. It uses an absolute path so the server still resolves after Codex caches the plugin.
- `skills/live-canvas-sync/SKILL.md`: workflow Codex follows while editing, testing, and finishing feature work.
- `assets/`: placeholder directory for future icon, logo, and screenshots.

## Expected Runtime

The plugin expects the app-side project to provide:

- Frontend SSE listener at `/api/events/stream`.
- Backend graph/event API at `LIVE_CANVAS_API_URL`.
- MCP server exposing `create_feature_node`, `update_feature_node`, `attach_diff`, `mark_test_result`, `mark_conflict`, and `get_node_context`.
- Git watcher that verifies changed files and raises conflict events.

## Demo Usage

1. Start the canvas backend and web app.
2. Build the MCP server with `npm run build --workspace mcp-server` or from `mcp-server/`.
3. Enable the `live-canvas-sync` skill for a Codex task.
4. Begin a feature task from the canvas or pass an existing `nodeId`.
5. Watch the node move from planning to editing, testing, and done as Codex calls MCP tools.

If MCP is not wired during the demo, use the skill as the source of truth for the updates Codex would send and replay the same payloads through the backend HTTP endpoints.
