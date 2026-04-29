import type { BackendClient } from "./backendClient";
import type {
  AttachDiffInput,
  CreateFeatureNodeInput,
  MarkConflictInput,
  MarkTestResultInput,
  McpTool,
  UpdateFeatureNodeInput,
} from "./types";
import {
  readAttachDiffInput,
  readCreateFeatureNodeInput,
  readGetNodeContextInput,
  readMarkConflictInput,
  readMarkTestResultInput,
  readUpdateFeatureNodeInput,
} from "./validators";

export function createFeatureNodeTool(backend: BackendClient): McpTool {
  return {
    name: "create_feature_node",
    description: "Create a Live Canvas feature node and link it to the current Codex task.",
    inputSchema: {
      type: "object",
      required: ["title", "originalPrompt"],
      properties: {
        title: { type: "string" },
        description: { type: "string" },
        originalPrompt: { type: "string" },
        threadId: { type: "string" },
        nodeId: { type: "string" },
      },
    },
    handler: (input: unknown) =>
      backend.createFeatureNode(readCreateFeatureNodeInput(input) satisfies CreateFeatureNodeInput),
  };
}

export function updateFeatureNodeTool(backend: BackendClient): McpTool {
  return {
    name: "update_feature_node",
    description: "Update Live Canvas node status, changed files, summary, or risk indicators.",
    inputSchema: {
      type: "object",
      required: ["nodeId"],
      properties: {
        nodeId: { type: "string" },
        status: {
          type: "string",
          enum: ["planning", "editing", "testing", "blocked", "done", "failed"],
        },
        summary: { type: "string" },
        changedFiles: { type: "array", items: { type: "string" } },
        riskLevel: { type: "string", enum: ["low", "medium", "high"] },
        riskReasons: { type: "array", items: { type: "string" } },
      },
    },
    handler: (input: unknown) =>
      backend.updateFeatureNode(readUpdateFeatureNodeInput(input) satisfies UpdateFeatureNodeInput),
  };
}

export function attachDiffTool(backend: BackendClient): McpTool {
  return {
    name: "attach_diff",
    description: "Attach a concise diff summary and changed-file list to a Live Canvas node.",
    inputSchema: {
      type: "object",
      required: ["nodeId", "changedFiles", "diffSummary"],
      properties: {
        nodeId: { type: "string" },
        changedFiles: { type: "array", items: { type: "string" } },
        diffSummary: { type: "string" },
      },
    },
    handler: (input: unknown) =>
      backend.attachDiff(readAttachDiffInput(input) satisfies AttachDiffInput),
  };
}

export function markTestResultTool(backend: BackendClient): McpTool {
  return {
    name: "mark_test_result",
    description: "Record the latest test command and result for a Live Canvas node.",
    inputSchema: {
      type: "object",
      required: ["nodeId", "command", "status"],
      properties: {
        nodeId: { type: "string" },
        command: { type: "string" },
        status: { type: "string", enum: ["running", "passed", "failed"] },
        outputSummary: { type: "string" },
      },
    },
    handler: (input: unknown) =>
      backend.markTestResult(readMarkTestResultInput(input) satisfies MarkTestResultInput),
  };
}

export function markConflictTool(backend: BackendClient): McpTool {
  return {
    name: "mark_conflict",
    description: "Record a conflict between feature nodes that touch the same files.",
    inputSchema: {
      type: "object",
      required: ["nodeIds", "files", "reason"],
      properties: {
        nodeIds: { type: "array", items: { type: "string" } },
        files: { type: "array", items: { type: "string" } },
        reason: { type: "string" },
      },
    },
    handler: (input: unknown) =>
      backend.markConflict(readMarkConflictInput(input) satisfies MarkConflictInput),
  };
}

export function getNodeContextTool(backend: BackendClient): McpTool {
  return {
    name: "get_node_context",
    description: "Fetch focused context for a follow-up Codex task scoped to one feature node.",
    inputSchema: {
      type: "object",
      required: ["nodeId"],
      properties: {
        nodeId: { type: "string" },
      },
    },
    handler: (input: unknown) => {
      const { nodeId } = readGetNodeContextInput(input);
      return backend.getNodeContext(nodeId);
    },
  };
}

