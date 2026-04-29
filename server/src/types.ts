export type FeatureStatus =
  | "idle"
  | "planning"
  | "editing"
  | "testing"
  | "blocked"
  | "done"
  | "failed";

export type TestStatus = "unknown" | "running" | "passed" | "failed";

export type RiskLevel = "low" | "medium" | "high";

export type MessageRole = "user" | "codex" | "system";

export type CanvasMessage = {
  id: string;
  nodeId: string;
  threadId?: string;
  role: MessageRole;
  content: string;
  createdAt: string;
};

export type FeatureNode = {
  id: string;
  title: string;
  description?: string;
  originalPrompt: string;
  status: FeatureStatus;
  linkedThreadIds: string[];
  linkedWorktreePaths: string[];
  changedFiles: string[];
  diffSummary?: string;
  testStatus: TestStatus;
  testCommand?: string;
  testOutputSummary?: string;
  riskLevel: RiskLevel;
  riskReasons: string[];
  summary?: string;
  createdAt: string;
  lastUpdatedAt: string;
};

export type CodexThreadStatus =
  | "queued"
  | "running"
  | "waiting"
  | "done"
  | "failed";

export type CodexThread = {
  id: string;
  nodeId: string;
  title: string;
  status: CodexThreadStatus;
  worktreePath?: string;
  branchName?: string;
  originalPrompt: string;
  messages: CanvasMessage[];
  changedFiles: string[];
  createdAt: string;
  updatedAt: string;
};

export type CanvasEvent =
  | {
      id: string;
      type: "node.created";
      nodeId: string;
      title: string;
      timestamp: string;
    }
  | {
      id: string;
      type: "thread.started";
      nodeId: string;
      threadId: string;
      timestamp: string;
    }
  | {
      id: string;
      type: "node.status.updated";
      nodeId: string;
      status: FeatureStatus;
      timestamp: string;
    }
  | {
      id: string;
      type: "file.changed";
      nodeId: string;
      threadId?: string;
      filePath: string;
      timestamp: string;
    }
  | {
      id: string;
      type: "diff.attached";
      nodeId: string;
      changedFiles: string[];
      diffSummary: string;
      timestamp: string;
    }
  | {
      id: string;
      type: "test.updated";
      nodeId: string;
      command: string;
      testStatus: TestStatus;
      outputSummary?: string;
      timestamp: string;
    }
  | {
      id: string;
      type: "conflict.detected";
      nodeIds: string[];
      files: string[];
      reason: string;
      timestamp: string;
    }
  | {
      id: string;
      type: "message.created";
      nodeId: string;
      threadId?: string;
      role: MessageRole;
      content: string;
      timestamp: string;
    };

export type GraphSnapshot = {
  nodes: FeatureNode[];
  threads: CodexThread[];
  events: CanvasEvent[];
  conflicts: Extract<CanvasEvent, { type: "conflict.detected" }>[];
};

export type NodeContext = {
  nodeId: string;
  title: string;
  description?: string;
  originalPrompt: string;
  status: FeatureStatus;
  changedFiles: string[];
  diffSummary?: string;
  testStatus: TestStatus;
  testCommand?: string;
  testOutputSummary?: string;
  riskLevel: RiskLevel;
  riskReasons: string[];
  linkedThreadIds: string[];
  recentMessages: CanvasMessage[];
};
