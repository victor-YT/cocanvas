import type { CodexTimelineEvent } from "@/lib/types/codex";

export interface CodexEventSource {
  startTask(input: {
    repoPath: string;
    prompt: string;
  }): AsyncIterable<CodexTimelineEvent>;
}
