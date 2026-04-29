"use client";

import { useCallback, useMemo, useState } from "react";
import { mockGraphEvents } from "@/lib/demo/mockGraphEvents";
import { reduceGraphEvents } from "@/lib/graph/reduceGraphEvents";
import type { GraphEvent } from "@/lib/types/observedGraph";

export function useGraphStore(initialEvents: GraphEvent[] = mockGraphEvents) {
  const [events, setEvents] = useState<GraphEvent[]>(initialEvents);
  const [selectedNodeId, setSelectedNodeId] = useState<string>();

  const graph = useMemo(() => {
    const reduced = reduceGraphEvents(events);
    return {
      ...reduced,
      selectedNodeId: selectedNodeId ?? reduced.selectedNodeId,
    };
  }, [events, selectedNodeId]);

  const selectNode = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId);
  }, []);

  const applyGraphEvent = useCallback((event: GraphEvent) => {
    setEvents((current) => [...current, event]);
  }, []);

  const replaceEvents = useCallback((nextEvents: GraphEvent[]) => {
    setEvents(nextEvents);
    setSelectedNodeId(undefined);
  }, []);

  const resetCanvas = useCallback(() => {
    setEvents([]);
    setSelectedNodeId(undefined);
  }, []);

  return {
    graph,
    events,
    selectNode,
    applyGraphEvent,
    replaceEvents,
    resetCanvas,
  };
}
