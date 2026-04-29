import type {
  GraphEvent,
  GraphTimelineItem,
  ObservedGraphEdge,
  ObservedGraphNode,
  ObservedGraphState,
} from "@/lib/types/observedGraph";

function emptyState(): ObservedGraphState {
  return {
    nodes: [],
    edges: [],
    timeline: [],
  };
}

function eventTimelineItem(event: GraphEvent, index: number): GraphTimelineItem {
  switch (event.type) {
    case "node.upsert":
      return {
        id: `timeline-${index}-${event.type}-${event.node.id}`,
        type: event.type,
        title: `Node updated: ${event.node.title}`,
        detail: event.node.summary,
        raw: event,
      };
    case "edge.upsert":
      return {
        id: `timeline-${index}-${event.type}-${event.edge.id}`,
        type: event.type,
        title: `Edge updated: ${event.edge.relation}`,
        detail: `${event.edge.from} -> ${event.edge.to}`,
        raw: event,
      };
    case "status.update":
      return {
        id: `timeline-${index}-${event.type}-${event.targetId}`,
        type: event.type,
        title: `Status updated: ${event.targetId}`,
        detail: `${event.status}${event.summary ? ` - ${event.summary}` : ""}`,
        raw: event,
      };
    case "evidence.add":
      return {
        id: `timeline-${index}-${event.type}-${event.evidence.id}`,
        type: event.type,
        title: `Evidence added: ${event.evidence.summary}`,
        detail: event.evidence.path,
        raw: event,
      };
    case "risk.add":
      return {
        id: `timeline-${index}-${event.type}-${event.risk.id}`,
        type: event.type,
        title: `Risk added: ${event.risk.summary}`,
        detail: `Severity: ${event.risk.severity}`,
        raw: event,
      };
  }
}

function defaultNode(id: string): ObservedGraphNode {
  return {
    id,
    nodeType: "capability",
    title: id.replaceAll("_", " "),
    status: "planned",
    evidence: [],
    risks: [],
    relatedFiles: [],
    rawEvents: [],
  };
}

function upsertNode(
  nodes: ObservedGraphNode[],
  nextNode: Partial<ObservedGraphNode> & Pick<ObservedGraphNode, "id">,
) {
  const existing = nodes.find((node) => node.id === nextNode.id);

  if (!existing) {
    nodes.push({
      ...defaultNode(nextNode.id),
      ...nextNode,
      evidence: nextNode.evidence ?? [],
      risks: nextNode.risks ?? [],
      relatedFiles: nextNode.relatedFiles ?? [],
      rawEvents: nextNode.rawEvents ?? [],
    });
    return;
  }

  Object.assign(existing, {
    ...nextNode,
    evidence: nextNode.evidence ?? existing.evidence,
    risks: nextNode.risks ?? existing.risks,
    relatedFiles: nextNode.relatedFiles ?? existing.relatedFiles,
    rawEvents: nextNode.rawEvents ?? existing.rawEvents,
  });
}

function upsertEdge(edges: ObservedGraphEdge[], edge: ObservedGraphEdge) {
  if (edge.relation !== "contains") {
    return;
  }

  const existing = edges.find((item) => item.id === edge.id);

  if (existing) {
    Object.assign(existing, edge);
    return;
  }

  edges.push(edge);
}

function addRelatedFile(node: ObservedGraphNode, path?: string) {
  if (path && !node.relatedFiles.includes(path)) {
    node.relatedFiles.push(path);
  }
}

function isCanvasFeatureNode(nodeType: string) {
  return nodeType !== "evidence" && nodeType !== "risk";
}

export function reduceGraphEvents(events: GraphEvent[]): ObservedGraphState {
  const state = emptyState();

  events.forEach((event, index) => {
    state.timeline = [eventTimelineItem(event, index), ...state.timeline];

    if (event.type === "node.upsert") {
      if (!isCanvasFeatureNode(event.node.nodeType)) {
        return;
      }

      upsertNode(state.nodes, {
        id: event.node.id,
        nodeType: event.node.nodeType,
        title: event.node.title,
        status: event.node.status ?? "planned",
        summary: event.node.summary,
        confidence: event.node.confidence,
        relatedFiles: event.node.relatedFiles,
        rawEvents: [event],
      });
      state.selectedNodeId ??= event.node.id;
      return;
    }

    if (event.type === "edge.upsert") {
      upsertEdge(state.edges, event.edge);
      return;
    }

    if (event.type === "status.update") {
      upsertNode(state.nodes, { id: event.targetId });
      const target = state.nodes.find((node) => node.id === event.targetId);

      if (target) {
        target.status = event.status;
        target.summary = event.summary ?? target.summary;
        target.rawEvents.push(event);
        state.selectedNodeId = target.id;
      }
      return;
    }

    if (event.type === "evidence.add") {
      upsertNode(state.nodes, { id: event.targetId });
      const target = state.nodes.find((node) => node.id === event.targetId);

      if (target) {
        target.evidence.push(event.evidence);
        addRelatedFile(target, event.evidence.path);
        target.rawEvents.push(event);
        state.selectedNodeId = target.id;
      }
      return;
    }

    if (event.type === "risk.add") {
      upsertNode(state.nodes, { id: event.targetId });
      const target = state.nodes.find((node) => node.id === event.targetId);

      if (target) {
        target.status = "risk";
        target.risks.push(event.risk);
        addRelatedFile(target, event.risk.path);
        target.rawEvents.push(event);
        state.selectedNodeId = target.id;
      }
    }
  });

  return state;
}
