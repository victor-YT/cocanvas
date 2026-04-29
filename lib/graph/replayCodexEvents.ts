import type { CodexTimelineEvent } from "@/lib/types/codex";
import type { GraphState } from "@/lib/types/graph";
import { updateGraphFromCodexEvent } from "./updateGraphFromCodexEvent";

export function replayCodexEvents(
  initialGraph: GraphState,
  events: CodexTimelineEvent[],
) {
  return events.reduce(
    (graph, event) => updateGraphFromCodexEvent(graph, event),
    initialGraph,
  );
}
