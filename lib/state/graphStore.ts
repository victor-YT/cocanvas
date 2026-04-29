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

  const removeNode = useCallback((nodeId: string) => {
    setEvents((current) =>
      current.filter((event) => {
        if (event.type === "node.upsert") {
          return event.node.id !== nodeId;
        }

        if (event.type === "edge.upsert") {
          return event.edge.from !== nodeId && event.edge.to !== nodeId;
        }

        if (
          event.type === "status.update" ||
          event.type === "evidence.add" ||
          event.type === "risk.add"
        ) {
          return event.targetId !== nodeId;
        }

        return true;
      }),
    );
    setSelectedNodeId((current) => (current === nodeId ? null : current));
  }, []);

  return {
    graph,
    events,
    selectNode,
    clearSelectedNode,
    applyGraphEvent,
    applyGraphEvents,
    removeNode,
    replaceEvents,
    resetCanvas,
  };
}
