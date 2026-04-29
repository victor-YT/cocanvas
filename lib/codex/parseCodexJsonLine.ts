import type { CodexTimelineEvent } from "@/lib/types/codex";

export function parseCodexJsonLine(line: string): CodexTimelineEvent | undefined {
  try {
    const raw = JSON.parse(line) as Record<string, unknown>;
    return {
      id: String(raw.id ?? crypto.randomUUID()),
      type: "agent_message",
      title: String(raw.type ?? "Codex event"),
      detail: typeof raw.message === "string" ? raw.message : undefined,
      timestamp: new Date().toISOString(),
      raw,
    };
  } catch {
    return undefined;
  }
}
