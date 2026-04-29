import { mockCodexEvents } from "@/lib/demo/mockCodexEvents";
import type { CodexTimelineEvent } from "@/lib/types/codex";
import type { CodexEventSource } from "./CodexEventSource";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class MockCodexEventSource implements CodexEventSource {
  async *startTask(input: {
    repoPath: string;
    prompt: string;
  }): AsyncIterable<CodexTimelineEvent> {
    void input;

    for (const event of mockCodexEvents) {
      await wait(700);
      yield { ...event, timestamp: new Date().toISOString() };
    }
  }
}
