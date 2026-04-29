"use client";

import { useMemo, type ReactNode } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import type {
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
    card: "border-zinc-200 bg-white text-zinc-800",
    dot: "bg-zinc-300",
    label: "Planned",
  },
  building: {
    card: "border-amber-300 bg-white text-zinc-900 shadow-amber-200/40",
    dot: "bg-amber-400",
    label: "Building",
  },
  implemented: {
    card: "border-blue-300 bg-white text-zinc-900 shadow-blue-200/40",
    dot: "bg-blue-400",
    label: "Implemented",
  },
  needs_evidence: {
    card: "border-zinc-300 bg-white text-zinc-900",
    dot: "bg-zinc-400",
    label: "Needs evidence",
  },
  verified: {
    card: "border-emerald-300 bg-white text-zinc-900 shadow-emerald-200/40",
    dot: "bg-emerald-400",
    label: "Verified",
  },
  risk: {
    card: "border-rose-300 bg-white text-zinc-900 shadow-rose-200/40",
    dot: "bg-rose-400",
    label: "Risk",
  },
  unlinked: {
    card: "border-violet-300 bg-white text-zinc-900 shadow-violet-200/40",
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

function defaultPosition(node: ObservedGraphNode, index: number) {
  if (node.nodeType === "feature") {
    return { x: 70, y: 290 };
  }

  if (node.nodeType === "flow") {
    return { x: 420, y: 85 + index * 180 };
  }

  if (node.nodeType === "capability") {
    return { x: 420, y: 600 + index * 180 };
  }

  if (node.nodeType === "risk") {
    return { x: 840, y: 170 + index * 165 };
  }

  if (node.nodeType === "evidence") {
    return { x: 840, y: 535 + index * 165 };
  }

  return { x: 1180, y: 300 + index * 170 };
}

function buildNodes(graph: ObservedGraphState, selectedNodeId?: string): CanvasNode[] {
  const typeCounts: Partial<Record<ObservedNodeType, number>> = {};

  return graph.nodes.map((node) => {
    const index = typeCounts[node.nodeType] ?? 0;
    typeCounts[node.nodeType] = index + 1;

    return {
      id: node.id,
      type: "observed",
      data: { observedNode: node },
      position: defaultPosition(node, index),
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
  return graph.edges.map((edge) => ({
    id: edge.id,
    source: edge.from,
    target: edge.to,
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
  }));
}

function ObservedNodeCard({ data, selected }: NodeProps<CanvasNode>) {
  const node = data.observedNode;
  const tone = statusTone[node.status];

  return (
    <div
      className={`cocanvas-node w-[250px] rounded-xl border px-4 py-3 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-lg ${tone.card} ${
        selected ? "ring-2 ring-zinc-950 ring-offset-2" : ""
      }`}
      role="button"
      tabIndex={0}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-[15px] font-semibold">{node.title}</div>
          <div className="mt-1 text-xs font-medium text-zinc-500">
            {nodeTypeLabel[node.nodeType]}
          </div>
        </div>
        <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${tone.dot}`} />
      </div>
      <div className="mt-3 text-xs font-medium text-zinc-500">{tone.label}</div>
      {node.summary ? (
        <p className="mt-2 line-clamp-2 text-xs leading-5 text-zinc-500">
          {node.summary}
        </p>
      ) : null}
    </div>
  );
}

const nodeTypes = {
  observed: ObservedNodeCard,
};

export function FeatureCanvas({
  graph,
  selectedNodeId,
  onSelectNode,
  topControls,
  actionControls,
  chatPanel,
}: FeatureCanvasProps) {
  const nodes = useMemo(
    () => buildNodes(graph, selectedNodeId),
    [graph, selectedNodeId],
  );
  const edges = useMemo(() => buildEdges(graph), [graph]);

  return (
    <section className="relative min-h-[640px] overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm lg:min-h-[calc(100vh-24px)]">
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
          className="absolute bottom-5 left-5 right-5 z-30 flex justify-center"
          onPointerDown={(event) => event.stopPropagation()}
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
        fitViewOptions={{ padding: 0.28, maxZoom: 1.08 }}
        defaultViewport={{ x: 80, y: 80, zoom: 0.82 }}
        minZoom={0.35}
        maxZoom={1.6}
        nodesDraggable
        nodesConnectable={false}
        elementsSelectable
        proOptions={{ hideAttribution: true }}
        className="cocanvas-flow"
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
