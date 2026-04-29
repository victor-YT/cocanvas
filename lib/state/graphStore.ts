"use client";

import { useCallback, useMemo, useState } from "react";
import { reduceGraphEvents } from "@/lib/graph/reduceGraphEvents";
import type { GraphEvent } from "@/lib/types/observedGraph";

export function useGraphStore(initialEvents: GraphEvent[] = []) {
  const [events, setEvents] = useState<GraphEvent[]>(initialEvents);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>();

  const graph = useMemo(() => {
    const reduced = reduceGraphEvents(events);
    return {
      ...reduced,
      selectedNodeId:
        selectedNodeId === undefined
          ? reduced.selectedNodeId
          : selectedNodeId ?? undefined,
    };
  }, [events, selectedNodeId]);

  const selectNode = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId);
  }, []);

  const clearSelectedNode = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  const applyGraphEvent = useCallback((event: GraphEvent) => {
    setEvents((current) => [...current, event]);
  }, []);

  const applyGraphEvents = useCallback((nextEvents: GraphEvent[]) => {
    setEvents((current) => [...current, ...nextEvents]);
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
    clearSelectedNode,
    applyGraphEvent,
    applyGraphEvents,
    replaceEvents,
    resetCanvas,
  };
}
