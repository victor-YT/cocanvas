# Live Canvas Plugin Architecture

## Purpose

The plugin layer makes cocanvas Codex-native. It tells Codex how to report useful progress and gives Codex MCP tools for creating and updating feature nodes without coupling the agent to the React canvas implementation.

## Owned By Thread 4

Thread 4 owns the documentation and plugin package:

- `plugin/.codex-plugin/plugin.json`
- `plugin/plugin.json`
- `plugin/skills/live-canvas-sync/SKILL.md`
- `plugin/mcp/live-canvas.mcp.json`
- `plugin/README.md`
- `docs/LIVE_CANVAS_PLUGIN_ARCHITECTURE.md`
- `docs/LIVE_CANVAS_PLUGIN_DEMO_SCRIPT.md`

Other threads can implement against these contracts without editing the plugin docs.

## System Flow

```text
Codex task
  -> live-canvas-sync skill
  -> Live Canvas MCP tools
  -> backend event store
  -> SSE event stream
  -> React feature canvas
  -> node chat follow-up
  -> Codex task with get_node_context
```

## Plugin Pieces

### Skill

`live-canvas-sync` is the behavioral contract for Codex. It says when to mark nodes as planning, editing, testing, blocked, done, or failed. It also defines how to report changed files, risks, conflicts, and final summaries.

### Manifest

`.codex-plugin/plugin.json` is the canonical Codex plugin manifest. `plugin/plugin.json` is a compact project manifest that mirrors the hackathon plan and is easier to scan during the demo.

### MCP Config

`plugin/mcp/live-canvas.mcp.json` describes the Live Canvas MCP server entrypoint and required environment:

- `LIVE_CANVAS_API_URL`
- `LIVE_CANVAS_EVENT_STREAM_URL`

Thread 3 should make the server expose these tools:

- `create_feature_node`
- `update_feature_node`
- `attach_diff`
- `mark_test_result`
- `mark_conflict`
- `get_node_context`

## Event Contract

MCP tools should persist backend events that the frontend can consume over SSE. The minimum event set is:

```ts
type CanvasEvent =
  | { type: "node.created"; nodeId: string; title: string }
  | { type: "thread.started"; nodeId: string; threadId: string }
  | { type: "node.status.updated"; nodeId: string; status: string }
  | { type: "file.changed"; nodeId: string; threadId?: string; filePath: string }
  | { type: "diff.attached"; nodeId: string; diffSummary: string }
  | { type: "test.updated"; nodeId: string; status: "running" | "passed" | "failed" }
  | { type: "conflict.detected"; nodeIds: string[]; files: string[] }
  | { type: "message.created"; nodeId: string; threadId?: string; role: "user" | "codex"; content: string };
```

## Node Context Contract

`get_node_context` should return a compact bundle for follow-up chats:

```ts
type NodeContext = {
  nodeId: string;
  title: string;
  originalPrompt: string;
  status: string;
  changedFiles: string[];
  diffSummary?: string;
  testStatus: "unknown" | "running" | "passed" | "failed";
  riskLevel: "low" | "medium" | "high";
  riskReasons: string[];
  recentMessages: Array<{ role: "user" | "codex"; content: string; createdAt: string }>;
};
```

Keep this response intentionally small. Node chat should focus Codex on the selected feature instead of reloading the whole repository story.

## Fallback Mode

If real MCP wiring is not ready in the demo, the skill still defines the expected updates. The backend can expose matching HTTP endpoints, and the demo can replay the same payloads with `curl` or mock events.
