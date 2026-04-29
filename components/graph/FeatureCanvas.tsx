"use client";

import { useEffect, useMemo, useRef, type ReactNode } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  PanOnScrollMode,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import type {
  ObservedGraphEdge,
  ObservedGraphNode,
  ObservedGraphState,
  ObservedNodeStatus,
  ObservedNodeType,
} from "@/lib/types/observedGraph";

type FeatureCanvasProps = {
  graph: ObservedGraphState;
  selectedNodeId?: string;
  onSelectNode: (id: string) => void;
  topControls?: ReactNode;
  actionControls?: ReactNode;
  chatPanel?: ReactNode;
};

type CanvasNodeData = {
  observedNode: ObservedGraphNode;
};

type CanvasNode = Node<CanvasNodeData, "observed">;

const statusTone: Record<ObservedNodeStatus, { dot: string; label: string }> = {
  planned: {
    dot: "bg-zinc-300",
    label: "Planned",
  },
  building: {
    dot: "bg-emerald-400",
    label: "Building",
  },
  implemented: {
    dot: "bg-blue-400",
    label: "Implemented",
  },
  needs_evidence: {
    dot: "bg-zinc-400",
    label: "Needs evidence",
  },
  verified: {
    dot: "bg-emerald-400",
    label: "Verified",
  },
  risk: {
    dot: "bg-rose-400",
    label: "Risk",
  },
  unlinked: {
    dot: "bg-violet-400",
    label: "Unlinked",
  },
};

const nodeTypeLabel: Record<ObservedNodeType, string> = {
  feature: "Feature",
  flow: "Flow",
  capability: "Capability",
  evidence: "Evidence",
  risk: "Risk",
  cluster: "Unlinked Cluster",
};

const layerX: Record<ObservedNodeType, number> = {
  feature: 100,
  flow: 430,
  capability: 760,
  evidence: 1090,
  risk: 1090,
  cluster: 1220,
};

const nodeGapY = 210;
const childGapY = 165;
const canvasCenterY = 340;
const minCanvasY = 120;

function visualEdge(edge: ObservedGraphEdge) {
  if (edge.relation === "supports" || edge.relation === "blocks") {
    return {
      from: edge.to,
      to: edge.from,
    };
  }

  return {
    from: edge.from,
    to: edge.to,
  };
}

function stableSiblingOffset(index: number, gap: number) {
  if (index === 0) {
    return 0;
  }

  const distance = Math.ceil(index / 2) * gap;
  return index % 2 === 1 ? distance : -distance;
}

function parentMapForGraph(graph: ObservedGraphState) {
  const nodesById = new Map(graph.nodes.map((node) => [node.id, node]));
  const parentsById = new Map<string, string[]>();

  graph.edges.map(visualEdge).forEach((edge) => {
    if (!nodesById.has(edge.from) || !nodesById.has(edge.to)) {
      return;
    }

    parentsById.set(edge.to, [...(parentsById.get(edge.to) ?? []), edge.from]);
  });

  return parentsById;
}

function preferredParentId(
  node: ObservedGraphNode,
  parentsById: Map<string, string[]>,
  nodesById: Map<string, ObservedGraphNode>,
) {
  const parents = parentsById.get(node.id) ?? [];

  if (parents.length === 0) {
    return undefined;
  }

  if (node.nodeType === "evidence" || node.nodeType === "risk") {
    return parents.find((parentId) => nodesById.has(parentId)) ?? parents[0];
  }

  if (node.nodeType === "flow") {
    return (
      parents.find((parentId) => nodesById.get(parentId)?.nodeType === "feature") ??
      parents[0]
    );
  }

  if (node.nodeType === "capability") {
    return (
      parents.find((parentId) => nodesById.get(parentId)?.nodeType === "flow") ??
      parents.find((parentId) => nodesById.get(parentId)?.nodeType === "feature") ??
      parents[0]
    );
  }

  return parents[0];
}

function siblingGroupKey(node: ObservedGraphNode, parentId?: string) {
  if (node.nodeType === "evidence" || node.nodeType === "risk") {
    return `detail:${parentId ?? "root"}`;
  }

  return `${node.nodeType}:${parentId ?? "root"}`;
}

function resolveLayerCollisions(
  nodes: ObservedGraphNode[],
  positionById: Map<string, { x: number; y: number }>,
) {
  const nodesByLayer = new Map<number, ObservedGraphNode[]>();

  nodes.forEach((node) => {
    const x = positionById.get(node.id)?.x ?? layerX[node.nodeType];
    nodesByLayer.set(x, [...(nodesByLayer.get(x) ?? []), node]);
  });

  nodesByLayer.forEach((layerNodes) => {
    let nextY = minCanvasY;

    [...layerNodes]
      .sort((nodeA, nodeB) => {
        const positionA = positionById.get(nodeA.id);
        const positionB = positionById.get(nodeB.id);

        if ((positionA?.y ?? 0) !== (positionB?.y ?? 0)) {
          return (positionA?.y ?? 0) - (positionB?.y ?? 0);
        }

        return nodes.indexOf(nodeA) - nodes.indexOf(nodeB);
      })
      .forEach((node) => {
        const current = positionById.get(node.id) ?? {
          x: layerX[node.nodeType],
          y: canvasCenterY,
        };
        const y = Math.max(current.y, nextY);

        positionById.set(node.id, {
          ...current,
          y,
        });
        nextY = y + nodeGapY;
      });
  });
}

function layoutGraph(graph: ObservedGraphState) {
  const nodesById = new Map(graph.nodes.map((node) => [node.id, node]));
  const parentsById = parentMapForGraph(graph);
  const siblingIndexByParent = new Map<string, number>();
  const positionById = new Map<string, { x: number; y: number }>();

  graph.nodes.forEach((node, index) => {
    if (node.nodeType === "feature") {
      positionById.set(node.id, {
        x: layerX.feature,
        y: canvasCenterY + stableSiblingOffset(index, nodeGapY),
      });
    }
  });

  graph.nodes.forEach((node) => {
    if (positionById.has(node.id)) {
      return;
    }

    const parentId = preferredParentId(node, parentsById, nodesById);
    const parent = parentId ? positionById.get(parentId) : undefined;
    const parentKey = siblingGroupKey(node, parentId);
    const siblingIndex = siblingIndexByParent.get(parentKey) ?? 0;
    siblingIndexByParent.set(parentKey, siblingIndex + 1);

    positionById.set(node.id, {
      x: layerX[node.nodeType],
      y:
        (parent?.y ?? canvasCenterY) +
        stableSiblingOffset(
          siblingIndex,
          node.nodeType === "evidence" || node.nodeType === "risk"
            ? childGapY
            : nodeGapY,
        ),
    });
  });

  resolveLayerCollisions(graph.nodes, positionById);

  return positionById;
}

function buildNodes(graph: ObservedGraphState, selectedNodeId?: string): CanvasNode[] {
  const positionById = layoutGraph(graph);

  return graph.nodes.map((node) => {
    return {
      id: node.id,
      type: "observed",
      data: { observedNode: node },
      position: positionById.get(node.id) ?? { x: 0, y: canvasCenterY },
      selected: selectedNodeId === node.id,
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    };
  });
}

function edgeStyle(relation: string) {
  if (relation === "supports") {
    return { stroke: "#6ee7b7", strokeWidth: 2.4 };
  }

  if (relation === "blocks") {
    return { stroke: "#fda4af", strokeWidth: 2.4 };
  }

  if (relation === "enables") {
    return { stroke: "#93c5fd", strokeWidth: 2.2 };
  }

  return { stroke: "#d4d4d8", strokeWidth: 2 };
}

function buildEdges(graph: ObservedGraphState): Edge[] {
  return graph.edges.map((edge) => {
    const displayEdge = visualEdge(edge);

    return {
      id: edge.id,
      source: displayEdge.from,
      target: displayEdge.to,
      type: "smoothstep",
      label: edge.label ?? edge.relation,
      animated: edge.relation === "supports" || edge.relation === "blocks",
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: edgeStyle(edge.relation).stroke,
        width: 16,
        height: 16,
      },
      style: edgeStyle(edge.relation),
      labelStyle: {
        fill: "#71717a",
        fontSize: 11,
        fontWeight: 600,
      },
      labelBgStyle: {
        fill: "rgba(255, 255, 255, 0.86)",
      },
      labelBgPadding: [8, 4],
      labelBgBorderRadius: 8,
    };
  });
}

function ObservedNodeCard({ data, selected }: NodeProps<CanvasNode>) {
  const node = data.observedNode;
  const tone = statusTone[node.status];

  return (
    <div
      className={`cocanvas-node relative w-[310px] rounded-[18px] border border-zinc-200 bg-white px-5 py-[18px] text-left text-zinc-900 shadow-[0_12px_28px_rgba(24,24,27,0.08)] transition duration-200 hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-[0_16px_34px_rgba(24,24,27,0.12)] ${
        selected ? "ring-2 ring-zinc-950 ring-offset-2" : ""
      }`}
      role="button"
      tabIndex={0}
    >
      {node.status === "building" ? (
        <span
          aria-label="Working"
          className="cocanvas-working-dot absolute right-4 top-4 h-3.5 w-3.5 rounded-full bg-emerald-400"
        />
      ) : null}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 pr-6">
          <div className="truncate text-[19px] font-semibold leading-7 tracking-normal">
            {node.title}
          </div>
          <div className="mt-1.5 text-[12px] font-semibold uppercase text-zinc-500">
            {nodeTypeLabel[node.nodeType]}
          </div>
        </div>
      </div>
      <div className="mt-4 inline-flex rounded-full bg-zinc-100 px-3 py-1 text-[13px] font-semibold text-zinc-700">
        {tone.label}
      </div>
      {node.summary ? (
        <p className="mt-3 line-clamp-2 text-[15px] leading-6 text-zinc-600">
          {node.summary}
        </p>
      ) : null}
    </div>
  );
}

const nodeTypes = {
  observed: ObservedNodeCard,
};

function FeatureCanvasInner({
  graph,
  selectedNodeId,
  onSelectNode,
  topControls,
  actionControls,
  chatPanel,
}: FeatureCanvasProps) {
  const { fitView } = useReactFlow<CanvasNode, Edge>();
  const didFitInitialNodes = useRef(false);
  const nodes = useMemo(
    () => buildNodes(graph, selectedNodeId),
    [graph, selectedNodeId],
  );
  const edges = useMemo(() => buildEdges(graph), [graph]);

  useEffect(() => {
    if (nodes.length === 0) {
      didFitInitialNodes.current = false;
      return;
    }

    if (didFitInitialNodes.current) {
      return;
    }

    didFitInitialNodes.current = true;
    const timeoutId = window.setTimeout(() => {
      void fitView({ padding: 0.34, maxZoom: 0.95, duration: 420 });
    }, 80);

    return () => window.clearTimeout(timeoutId);
  }, [fitView, nodes.length]);

  return (
    <section className="relative h-screen min-h-[640px] overflow-hidden bg-white">
      <div className="absolute left-4 top-4 z-20 flex max-w-[calc(100%-2rem)] flex-wrap items-center gap-2">
        {topControls}
        <div className="hidden h-11 items-center gap-3 rounded-full border border-zinc-200 bg-white/95 px-5 text-sm font-semibold text-zinc-600 shadow-sm md:flex">
          {Object.entries(statusTone).map(([status, tone]) => (
            <div key={status} className="flex items-center gap-1.5">
              <span className={`h-2.5 w-2.5 rounded-full ${tone.dot}`} />
              <span>{tone.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute right-4 top-4 z-30 flex flex-wrap justify-end gap-2">
        {actionControls}
      </div>

      {chatPanel ? (
        <div
          className="pointer-events-none absolute bottom-5 left-5 right-5 z-30 flex justify-center"
        >
          {chatPanel}
        </div>
      ) : null}

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={(_, node) => onSelectNode(node.id)}
        fitView
        fitViewOptions={{ padding: 0.34, maxZoom: 0.95 }}
        defaultViewport={{ x: 0, y: 0, zoom: 0.82 }}
        minZoom={0.35}
        maxZoom={1.6}
        panOnDrag={[0, 1, 2]}
        panOnScroll
        panOnScrollMode={PanOnScrollMode.Free}
        panOnScrollSpeed={1.1}
        zoomOnScroll={false}
        zoomOnPinch
        zoomOnDoubleClick={false}
        preventScrolling
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable
        proOptions={{ hideAttribution: true }}
        className="cocanvas-flow absolute inset-0 h-full w-full"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={30}
          size={3}
          color="#c5c7bf"
        />
        <Controls
          position="bottom-left"
          showInteractive={false}
          className="cocanvas-flow-controls"
        />
      </ReactFlow>
    </section>
  );
}

export function FeatureCanvas(props: FeatureCanvasProps) {
  return (
    <ReactFlowProvider>
      <FeatureCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
