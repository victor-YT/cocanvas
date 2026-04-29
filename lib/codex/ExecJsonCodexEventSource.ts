import type { CodexTimelineEvent } from "@/lib/types/codex";
import type { CodexEventSource } from "./CodexEventSource";

export class ExecJsonCodexEventSource implements CodexEventSource {
  async *startTask(input: {
    repoPath: string;
    prompt: string;
  }): AsyncIterable<CodexTimelineEvent> {
    void input;

    // TODO: Spawn `codex exec --json`, parse JSONL with parseCodexJsonLine,
    // and normalize every raw event into CodexTimelineEvent.
    yield {
      id: "exec-json-placeholder",
      type: "agent_message",
      title: "codex exec --json adapter placeholder",
      detail: "Wire child_process.spawn here for the hackathon fast path.",
      timestamp: new Date().toISOString(),
    };
  }
}
