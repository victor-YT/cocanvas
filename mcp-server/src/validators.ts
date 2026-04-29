import type {
  AttachDiffInput,
  CreateFeatureNodeInput,
  FeatureNodeStatus,
  MarkConflictInput,
  MarkTestResultInput,
  RiskLevel,
  UpdateFeatureNodeInput,
} from "./types";

const STATUSES = new Set<FeatureNodeStatus>([
  "planning",
  "editing",
  "testing",
  "blocked",
  "done",
  "failed",
]);
const RISK_LEVELS = new Set<RiskLevel>(["low", "medium", "high"]);
const TEST_STATUSES = new Set(["running", "passed", "failed"]);

export function readCreateFeatureNodeInput(input: unknown): CreateFeatureNodeInput {
  const object = readObject(input);

  return {
    title: readRequiredString(object, "title"),
    description: readOptionalString(object, "description"),
    originalPrompt: readRequiredString(object, "originalPrompt"),
    threadId: readOptionalString(object, "threadId"),
    nodeId: readOptionalString(object, "nodeId"),
  };
}

export function readUpdateFeatureNodeInput(input: unknown): UpdateFeatureNodeInput {
  const object = readObject(input);
  const status = readOptionalString(object, "status");
  const riskLevel = readOptionalString(object, "riskLevel");

  if (status && !STATUSES.has(status as FeatureNodeStatus)) {
    throw new Error(`Invalid status: ${status}`);
  }

  if (riskLevel && !RISK_LEVELS.has(riskLevel as RiskLevel)) {
    throw new Error(`Invalid riskLevel: ${riskLevel}`);
  }

  return {
    nodeId: readRequiredString(object, "nodeId"),
    status: status as FeatureNodeStatus | undefined,
    summary: readOptionalString(object, "summary"),
    changedFiles: readOptionalStringArray(object, "changedFiles"),
    riskLevel: riskLevel as RiskLevel | undefined,
    riskReasons: readOptionalStringArray(object, "riskReasons"),
  };
}

export function readAttachDiffInput(input: unknown): AttachDiffInput {
  const object = readObject(input);

  return {
    nodeId: readRequiredString(object, "nodeId"),
    changedFiles: readRequiredStringArray(object, "changedFiles"),
    diffSummary: readRequiredString(object, "diffSummary"),
  };
}

export function readMarkTestResultInput(input: unknown): MarkTestResultInput {
  const object = readObject(input);
  const status = readRequiredString(object, "status");

  if (!TEST_STATUSES.has(status)) {
    throw new Error(`Invalid test status: ${status}`);
  }

  return {
    nodeId: readRequiredString(object, "nodeId"),
    command: readRequiredString(object, "command"),
    status: status as MarkTestResultInput["status"],
    outputSummary: readOptionalString(object, "outputSummary"),
  };
}

export function readMarkConflictInput(input: unknown): MarkConflictInput {
  const object = readObject(input);

  return {
    nodeIds: readRequiredStringArray(object, "nodeIds"),
    files: readRequiredStringArray(object, "files"),
    reason: readRequiredString(object, "reason"),
  };
}

export function readGetNodeContextInput(input: unknown) {
  const object = readObject(input);

  return {
    nodeId: readRequiredString(object, "nodeId"),
  };
}

function readObject(input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Expected input to be an object");
  }

  return input as Record<string, unknown>;
}

function readRequiredString(object: Record<string, unknown>, key: string) {
  const value = object[key];

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Expected ${key} to be a non-empty string`);
  }

  return value;
}

function readOptionalString(object: Record<string, unknown>, key: string) {
  const value = object[key];

  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new Error(`Expected ${key} to be a string`);
  }

  return value;
}

function readRequiredStringArray(object: Record<string, unknown>, key: string) {
  const value = readOptionalStringArray(object, key);

  if (!value || value.length === 0) {
    throw new Error(`Expected ${key} to include at least one string`);
  }

  return value;
}

function readOptionalStringArray(object: Record<string, unknown>, key: string) {
  const value = object[key];

  if (value === undefined) {
    return undefined;
  }

  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(`Expected ${key} to be an array of strings`);
  }

  return value;
}

