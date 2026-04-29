"use client";

import { useCallback, useState } from "react";
import { mockGraph } from "@/lib/demo/mockGraph";
import type { CodexTimelineEvent } from "@/lib/types/codex";
import type { GraphState } from "@/lib/types/graph";
import { updateGraphFromCodexEvent } from "@/lib/graph/updateGraphFromCodexEvent";

export function useGraphStore(initialState: GraphState = mockGraph) {
  const [graph, setGraph] = useState<GraphState>(initialState);

  const selectNode = useCallback((selectedNodeId: string) => {
    setGraph((current) => ({ ...current, selectedNodeId }));
  }, []);

  const applyEvent = useCallback((event: CodexTimelineEvent) => {
    setGraph((current) => updateGraphFromCodexEvent(current, event));
  }, []);

  const resetGraph = useCallback(() => {
    setGraph(structuredClone(initialState));
  }, [initialState]);

  return { graph, selectNode, applyEvent, resetGraph };
}
