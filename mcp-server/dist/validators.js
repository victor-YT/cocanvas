"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readCreateFeatureNodeInput = readCreateFeatureNodeInput;
exports.readUpdateFeatureNodeInput = readUpdateFeatureNodeInput;
exports.readAttachDiffInput = readAttachDiffInput;
exports.readMarkTestResultInput = readMarkTestResultInput;
exports.readMarkConflictInput = readMarkConflictInput;
exports.readGetNodeContextInput = readGetNodeContextInput;
const STATUSES = new Set([
    "planning",
    "editing",
    "testing",
    "blocked",
    "done",
    "failed",
]);
const RISK_LEVELS = new Set(["low", "medium", "high"]);
const TEST_STATUSES = new Set(["running", "passed", "failed"]);
function readCreateFeatureNodeInput(input) {
    const object = readObject(input);
    return {
        title: readRequiredString(object, "title"),
        description: readOptionalString(object, "description"),
        originalPrompt: readRequiredString(object, "originalPrompt"),
        threadId: readOptionalString(object, "threadId"),
        nodeId: readOptionalString(object, "nodeId"),
    };
}
function readUpdateFeatureNodeInput(input) {
    const object = readObject(input);
    const status = readOptionalString(object, "status");
    const riskLevel = readOptionalString(object, "riskLevel");
    if (status && !STATUSES.has(status)) {
        throw new Error(`Invalid status: ${status}`);
    }
    if (riskLevel && !RISK_LEVELS.has(riskLevel)) {
        throw new Error(`Invalid riskLevel: ${riskLevel}`);
    }
    return {
        nodeId: readRequiredString(object, "nodeId"),
        status: status,
        summary: readOptionalString(object, "summary"),
        changedFiles: readOptionalStringArray(object, "changedFiles"),
        riskLevel: riskLevel,
        riskReasons: readOptionalStringArray(object, "riskReasons"),
    };
}
function readAttachDiffInput(input) {
    const object = readObject(input);
    return {
        nodeId: readRequiredString(object, "nodeId"),
        changedFiles: readRequiredStringArray(object, "changedFiles"),
        diffSummary: readRequiredString(object, "diffSummary"),
    };
}
function readMarkTestResultInput(input) {
    const object = readObject(input);
    const status = readRequiredString(object, "status");
    if (!TEST_STATUSES.has(status)) {
        throw new Error(`Invalid test status: ${status}`);
    }
    return {
        nodeId: readRequiredString(object, "nodeId"),
        command: readRequiredString(object, "command"),
        status: status,
        outputSummary: readOptionalString(object, "outputSummary"),
    };
}
function readMarkConflictInput(input) {
    const object = readObject(input);
    return {
        nodeIds: readRequiredStringArray(object, "nodeIds"),
        files: readRequiredStringArray(object, "files"),
        reason: readRequiredString(object, "reason"),
    };
}
function readGetNodeContextInput(input) {
    const object = readObject(input);
    return {
        nodeId: readRequiredString(object, "nodeId"),
    };
}
function readObject(input) {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
        throw new Error("Expected input to be an object");
    }
    return input;
}
function readRequiredString(object, key) {
    const value = object[key];
    if (typeof value !== "string" || value.trim().length === 0) {
        throw new Error(`Expected ${key} to be a non-empty string`);
    }
    return value;
}
function readOptionalString(object, key) {
    const value = object[key];
    if (value === undefined) {
        return undefined;
    }
    if (typeof value !== "string") {
        throw new Error(`Expected ${key} to be a string`);
    }
    return value;
}
function readRequiredStringArray(object, key) {
    const value = readOptionalStringArray(object, key);
    if (!value || value.length === 0) {
        throw new Error(`Expected ${key} to include at least one string`);
    }
    return value;
}
function readOptionalStringArray(object, key) {
    const value = object[key];
    if (value === undefined) {
        return undefined;
    }
    if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
        throw new Error(`Expected ${key} to be an array of strings`);
    }
    return value;
}
