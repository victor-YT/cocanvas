import type { CodexTimelineEvent } from "@/lib/types/codex";

const baseTime = "2026-04-29T01:00:00.000Z";

export const mockCodexEvents: CodexTimelineEvent[] = [
  {
    id: "event-plan-1",
    type: "plan_updated",
    title: "Plan: inspect password reset flow",
    detail: "Find token creation, validation, and tests before patching.",
    timestamp: baseTime,
    featureIds: ["feature-password-reset"],
  },
  {
    id: "event-file-1",
    type: "file_change",
    title: "Edited src/auth/reset-token.ts",
    detail: "Added consumed-at guard before accepting a reset token.",
    timestamp: baseTime,
    paths: ["src/auth/reset-token.ts"],
  },
  {
    id: "event-file-2",
    type: "file_change",
    title: "Edited tests/reset-token.test.ts",
    detail: "Added coverage for token reuse.",
    timestamp: baseTime,
    paths: ["tests/reset-token.test.ts"],
  },
  {
    id: "event-command-1",
    type: "command_started",
    title: "Running npm test -- reset-token",
    timestamp: baseTime,
    command: "npm test -- reset-token",
    featureIds: ["feature-password-reset"],
  },
  {
    id: "event-test-failed",
    type: "command_completed",
    title: "Test failed",
    detail: "Reuse test failed because consumed token state was not persisted.",
    timestamp: baseTime,
    command: "npm test -- reset-token",
    exitCode: 1,
    featureIds: ["feature-password-reset"],
  },
  {
    id: "event-file-3",
    type: "file_change",
    title: "Patched src/auth/reset-token.ts",
    detail: "Persisted token consumption before returning success.",
    timestamp: baseTime,
    paths: ["src/auth/reset-token.ts"],
  },
  {
    id: "event-command-2",
    type: "command_completed",
    title: "Tests passed",
    detail: "Token reuse test now passes.",
    timestamp: baseTime,
    command: "npm test -- reset-token",
    exitCode: 0,
    featureIds: ["feature-password-reset"],
  },
  {
    id: "event-drift-1",
    type: "file_change",
    title: "Unexpected edit: src/billing/subscription.ts",
    detail: "No PRD feature or current task scope maps to this file.",
    timestamp: baseTime,
    paths: ["src/billing/subscription.ts"],
  },
];
