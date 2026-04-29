"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createFeatureNodeTool = createFeatureNodeTool;
exports.updateFeatureNodeTool = updateFeatureNodeTool;
exports.attachDiffTool = attachDiffTool;
exports.markTestResultTool = markTestResultTool;
exports.markConflictTool = markConflictTool;
exports.getNodeContextTool = getNodeContextTool;
const validators_1 = require("./validators");
function createFeatureNodeTool(backend) {
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
        handler: (input) => backend.createFeatureNode((0, validators_1.readCreateFeatureNodeInput)(input)),
    };
}
function updateFeatureNodeTool(backend) {
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
        handler: (input) => backend.updateFeatureNode((0, validators_1.readUpdateFeatureNodeInput)(input)),
    };
}
function attachDiffTool(backend) {
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
        handler: (input) => backend.attachDiff((0, validators_1.readAttachDiffInput)(input)),
    };
}
function markTestResultTool(backend) {
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
        handler: (input) => backend.markTestResult((0, validators_1.readMarkTestResultInput)(input)),
    };
}
function markConflictTool(backend) {
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
        handler: (input) => backend.markConflict((0, validators_1.readMarkConflictInput)(input)),
    };
}
function getNodeContextTool(backend) {
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
        handler: (input) => {
            const { nodeId } = (0, validators_1.readGetNodeContextInput)(input);
            return backend.getNodeContext(nodeId);
        },
    };
}
