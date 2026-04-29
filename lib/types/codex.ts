export type CodexEventType =
  | "turn_started"
  | "turn_completed"
  | "plan_updated"
  | "file_change"
  | "diff_updated"
  | "command_started"
  | "command_completed"
  | "test_passed"
  | "test_failed"
  | "agent_message"
  | "error";

export type CodexTimelineEvent = {
  id: string;
  type: CodexEventType;
  title: string;
  detail?: string;
  timestamp: string;
  turnId?: string;
  paths?: string[];
  command?: string;
  exitCode?: number;
  diff?: string;
  featureIds?: string[];
  raw?: unknown;
};
