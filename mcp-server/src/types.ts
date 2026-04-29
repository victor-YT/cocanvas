export type FeatureNodeStatus =
  | "planning"
  | "editing"
  | "testing"
  | "blocked"
  | "done"
  | "failed";

export type RiskLevel = "low" | "medium" | "high";

export type TestStatus = "unknown" | "running" | "passed" | "failed";

export type Message = {
  role: "user" | "codex";
  content: string;
  createdAt?: string;
};

export type CreateFeatureNodeInput = {
  title: string;
  description?: string;
  originalPrompt: string;
  threadId?: string;
  nodeId?: string;
};

export type UpdateFeatureNodeInput = {
  nodeId: string;
  status?: FeatureNodeStatus;
  summary?: string;
  changedFiles?: string[];
  riskLevel?: RiskLevel;
  riskReasons?: string[];
};

export type AttachDiffInput = {
  nodeId: string;
  changedFiles: string[];
  diffSummary: string;
};

export type MarkTestResultInput = {
  nodeId: string;
  command: string;
  status: Exclude<TestStatus, "unknown">;
  outputSummary?: string;
};

export type MarkConflictInput = {
  nodeIds: string[];
  files: string[];
  reason: string;
};

export type FeatureNodeContext = {
  nodeId?: string;
  title: string;
  originalPrompt: string;
  changedFiles: string[];
  diffSummary?: string;
  testStatus: TestStatus;
  riskReasons: string[];
  recentMessages: Message[];
};

export type BackendDelivery<T = unknown> = {
  mode: "backend" | "offline";
  data: T;
};

export type JsonSchema = {
  type: "object";
  required?: string[];
  properties: Record<string, unknown>;
};

export type McpTool = {
  name: string;
  description: string;
  inputSchema: JsonSchema;
  handler(input: unknown): Promise<unknown> | unknown;
};

