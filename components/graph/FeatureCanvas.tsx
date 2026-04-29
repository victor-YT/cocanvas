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

const statusTone: Record<ObservedNodeStatus, { card: string; dot: string; label: string }> = {
  planned: {
    card: "border-zinc-300 bg-white text-zinc-900",
    dot: "bg-zinc-300",
    label: "Planned",
  },
  building: {
    card: "border-amber-400 bg-white text-zinc-900",
    dot: "bg-amber-400",
    label: "Building",
  },
  implemented: {
    card: "border-blue-400 bg-white text-zinc-900",
    dot: "bg-blue-400",
    label: "Implemented",
  },
  needs_evidence: {
    card: "border-zinc-400 bg-white text-zinc-900",
    dot: "bg-zinc-400",
    label: "Needs evidence",
  },
  verified: {
    card: "border-emerald-400 bg-white text-zinc-900",
    dot: "bg-emerald-400",
    label: "Verified",
  },
  risk: {
    card: "border-rose-400 bg-white text-zinc-900",
    dot: "bg-rose-400",
    label: "Risk",
  },
  unlinked: {
    card: "border-violet-400 bg-white text-zinc-900",
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

const layerGapX = 390;
const nodeGapY = 195;
const canvasCenterY = 340;

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

function nodeSortWeight(node: ObservedGraphNode) {
  const weights: Record<ObservedNodeType, number> = {
    feature: 0,
    flow: 1,
    capability: 2,
    evidence: 3,
    risk: 4,
    cluster: 5,
  };

  return weights[node.nodeType];
}

function buildNodePositions(graph: ObservedGraphState) {
  const nodesById = new Map(graph.nodes.map((node) => [node.id, node]));
  const nodeOrder = new Map(graph.nodes.map((node, index) => [node.id, index]));
  const usableEdges = graph.edges
    .map(visualEdge)
    .filter((edge) => nodesById.has(edge.from) && nodesById.has(edge.to));

  const incomingCount = new Map(graph.nodes.map((node) => [node.id, 0]));
  const parentIds = new Map<string, string[]>();

  usableEdges.forEach((edge) => {
    incomingCount.set(edge.to, (incomingCount.get(edge.to) ?? 0) + 1);
    parentIds.set(edge.to, [...(parentIds.get(edge.to) ?? []), edge.from]);
  });

  const depthById = new Map(graph.nodes.map((node) => [node.id, 0]));

  for (let pass = 0; pass < graph.nodes.length; pass += 1) {
    usableEdges.forEach((edge) => {
      const nextDepth = (depthById.get(edge.from) ?? 0) + 1;
      if (nextDepth > (depthById.get(edge.to) ?? 0)) {
        depthById.set(edge.to, nextDepth);
      }
    });
  }

  const maxLinkedDepth = Math.max(
    0,
    ...usableEdges.flatMap((edge) => [
      depthById.get(edge.from) ?? 0,
      depthById.get(edge.to) ?? 0,
    ]),
  );

  graph.nodes.forEach((node) => {
    const isIsolated = !usableEdges.some(
      (edge) => edge.from === node.id || edge.to === node.id,
    );

    if (isIsolated && node.nodeType === "cluster") {
      depthById.set(node.id, maxLinkedDepth + 1);
    }
  });

  const layers = new Map<number, ObservedGraphNode[]>();
  graph.nodes.forEach((node) => {
    const depth = depthById.get(node.id) ?? 0;
    layers.set(depth, [...(layers.get(depth) ?? []), node]);
  });

  const positionById = new Map<string, { x: number; y: number }>();

  [...layers.entries()]
    .sort(([depthA], [depthB]) => depthA - depthB)
    .forEach(([depth, layerNodes]) => {
      const orderedNodes = [...layerNodes].sort((nodeA, nodeB) => {
        const parentA = parentIds.get(nodeA.id)?.[0];
        const parentB = parentIds.get(nodeB.id)?.[0];
        const parentYA = parentA ? positionById.get(parentA)?.y : undefined;
        const parentYB = parentB ? positionById.get(parentB)?.y : undefined;

        if (parentYA !== undefined && parentYB !== undefined && parentYA !== parentYB) {
          return parentYA - parentYB;
        }

        if (nodeSortWeight(nodeA) !== nodeSortWeight(nodeB)) {
          return nodeSortWeight(nodeA) - nodeSortWeight(nodeB);
        }

        return (nodeOrder.get(nodeA.id) ?? 0) - (nodeOrder.get(nodeB.id) ?? 0);
      });

      const layerTop = canvasCenterY - ((orderedNodes.length - 1) * nodeGapY) / 2;

      orderedNodes.forEach((node, index) => {
        positionById.set(node.id, {
          x: depth * layerGapX,
          y: layerTop + index * nodeGapY,
        });
      });
    });

  return positionById;
}

function buildNodes(graph: ObservedGraphState, selectedNodeId?: string): CanvasNode[] {
  const positionById = buildNodePositions(graph);

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
      className={`cocanvas-node w-[310px] rounded-[18px] border-2 px-5 py-[18px] text-left shadow-[0_12px_28px_rgba(24,24,27,0.08)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(24,24,27,0.12)] ${tone.card} ${
        selected ? "ring-2 ring-zinc-950 ring-offset-2" : ""
      }`}
      role="button"
      tabIndex={0}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-[19px] font-semibold leading-7 tracking-normal">
            {node.title}
          </div>
          <div className="mt-1.5 text-[12px] font-semibold uppercase text-zinc-500">
            {nodeTypeLabel[node.nodeType]}
          </div>
        </div>
        <span className={`mt-2 h-3.5 w-3.5 shrink-0 rounded-full ${tone.dot}`} />
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
        <div className="hidden items-center gap-3 rounded-xl border border-zinc-200 bg-white/95 px-3 py-2 text-xs text-zinc-600 shadow-sm md:flex">
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
          gap={24}
          size={1.4}
          color="#d7d8d2"
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
