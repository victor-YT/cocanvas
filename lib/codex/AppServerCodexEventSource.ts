import type { CodexTimelineEvent } from "@/lib/types/codex";
import type { CodexEventSource } from "./CodexEventSource";

export class AppServerCodexEventSource implements CodexEventSource {
  async *startTask(input: {
    repoPath: string;
    prompt: string;
  }): AsyncIterable<CodexTimelineEvent> {
    void input;

    // TODO: Future JSON-RPC/App Server integration. UI should not depend on it.
    yield {
      id: "app-server-placeholder",
      type: "agent_message",
      title: "Codex App Server adapter placeholder",
      timestamp: new Date().toISOString(),
    };
  }
}
