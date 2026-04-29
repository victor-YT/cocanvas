"use client";

import { useEffect, useMemo, useRef, type ReactNode } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
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
import { Boxes, Layers, Route, type LucideIcon } from "lucide-react";
import type {
  ObservedGraphEdge,
  ObservedGraphNode,
  ObservedGraphState,
  ObservedNodeStatus,
} from "@/lib/types/observedGraph";

type FeatureCanvasProps = {
  graph: ObservedGraphState;
  selectedNodeId?: string;
  onSelectNode: (id: string) => void;
  topControls?: ReactNode;
  actionControls?: ReactNode;
  chatPanel?: ReactNode;
};

type CanvasNodeKind = "feature" | "part" | "unlinked";

type FeatureViewNode = {
  id: string;
  observedNode: ObservedGraphNode;
  kind: CanvasNodeKind;
  label: string;
  status: ObservedNodeStatus;
  evidenceCount: number;
  riskCount: number;
  partCount: number;
  verifiedPartCount: number;
  riskyPartCount: number;
};

type FeatureViewModel = {
  nodes: CanvasNode[];
  edges: Edge[];
};

type CanvasNodeData = {
  viewNode: FeatureViewNode;
};

type CanvasNode = Node<CanvasNodeData, "observed">;

type NodeTone = {
  border: string;
  accent: string;
  icon: string;
  ring: string;
  shadow: string;
  Icon: LucideIcon;
};

const statusLabel: Record<ObservedNodeStatus, string> = {
  planned: "Planned",
  building: "Building",
  implemented: "Implemented",
  needs_evidence: "Needs evidence",
  verified: "Verified",
  risk: "Risk",
  unlinked: "Unlinked",
};

const statusBadgeTone: Record<ObservedNodeStatus, string> = {
  planned: "bg-zinc-100 text-zinc-600",
  building: "bg-emerald-50 text-emerald-700",
  implemented: "bg-blue-50 text-blue-700",
  needs_evidence: "bg-zinc-100 text-zinc-700",
  verified: "bg-emerald-50 text-emerald-700",
  risk: "bg-rose-50 text-rose-700",
  unlinked: "bg-violet-50 text-violet-700",
};

const nodeTone: Record<CanvasNodeKind, NodeTone> = {
  feature: {
    border: "border-amber-300/70",
    accent: "bg-amber-400",
    icon: "bg-amber-50 text-amber-600",
    ring: "ring-amber-300/70",
    shadow: "shadow-[0_16px_38px_rgba(245,158,11,0.13)]",
    Icon: Layers,
  },
  part: {
    border: "border-blue-300/70",
    accent: "bg-blue-400",
    icon: "bg-blue-50 text-blue-600",
    ring: "ring-blue-300/70",
    shadow: "shadow-[0_14px_34px_rgba(59,130,246,0.12)]",
    Icon: Route,
  },
  unlinked: {
    border: "border-purple-300/70",
    accent: "bg-purple-400",
    icon: "bg-purple-50 text-purple-600",
    ring: "ring-purple-300/70",
    shadow: "shadow-[0_14px_34px_rgba(168,85,247,0.12)]",
    Icon: Boxes,
  },
};

const nodeSizeClass: Record<CanvasNodeKind, string> = {
  feature: "w-[320px] min-h-[158px]",
  part: "w-[330px] min-h-[136px]",
  unlinked: "w-[300px] min-h-[130px]",
};

const NODE_SIZE: Record<CanvasNodeKind, { width: number; height: number }> = {
  feature: { width: 320, height: 158 },
  part: { width: 330, height: 136 },
  unlinked: { width: 300, height: 130 },
};

const COLUMN_X = {
  feature: 120,
  part: 520,
  unlinked: 980,
};

const CANVAS_TOP = 170;
const PART_GAP = 34;
const GROUP_GAP = 96;
const UNLINKED_GAP = 44;

function isFeatureNode(node: ObservedGraphNode) {
  return node.nodeType === "feature";
}

function isPartNode(node: ObservedGraphNode) {
  return node.nodeType === "flow" || node.nodeType === "capability";
}

function isUnlinkedNode(node: ObservedGraphNode) {
  return node.nodeType === "cluster";
}

function visibleProductNodes(nodes: ObservedGraphNode[]) {
  return nodes.filter(
    (node) => isFeatureNode(node) || isPartNode(node) || isUnlinkedNode(node),
  );
}

function parentFeatureForPart(
  part: ObservedGraphNode,
  features: ObservedGraphNode[],
  productNodesById: Map<string, ObservedGraphNode>,
  incomingEdgesByTarget: Map<string, ObservedGraphEdge[]>,
) {
  const visited = new Set<string>();
  const queue = [part.id];

  while (queue.length > 0) {
    const currentId = queue.shift();

    if (!currentId || visited.has(currentId)) {
      continue;
    }

    visited.add(currentId);

    for (const edge of incomingEdgesByTarget.get(currentId) ?? []) {
      const source = productNodesById.get(edge.from);

      if (!source) {
        continue;
      }

      if (isFeatureNode(source)) {
        return source;
      }

      if (isPartNode(source)) {
        queue.push(source.id);
      }
    }
  }

  return features[0];
}

function edgeMapByTarget(edges: ObservedGraphEdge[]) {
  const incomingEdgesByTarget = new Map<string, ObservedGraphEdge[]>();

  edges.forEach((edge) => {
    if (edge.relation === "supports" || edge.relation === "blocks") {
      return;
    }

    incomingEdgesByTarget.set(edge.to, [
      ...(incomingEdgesByTarget.get(edge.to) ?? []),
      edge,
    ]);
  });

  return incomingEdgesByTarget;
}

function statusForPart(node: ObservedGraphNode) {
  if (node.risks.length > 0 || node.status === "risk") {
    return "risk";
  }

  if (node.status === "verified") {
    return "verified";
  }

  if (node.status === "building") {
    return "building";
  }

  if (node.status === "implemented") {
    return "implemented";
  }

  return node.status;
}

function featureSummary(
  parts: ObservedGraphNode[],
  clusters: ObservedGraphNode[],
) {
  const verifiedPartCount = parts.filter(
    (part) => statusForPart(part) === "verified",
  ).length;
  const riskyPartCount = parts.filter(
    (part) => statusForPart(part) === "risk",
  ).length;

  return {
    partCount: parts.length,
    verifiedPartCount,
    riskyPartCount,
    clusterCount: clusters.length,
  };
}

function toViewNode(
  node: ObservedGraphNode,
  kind: CanvasNodeKind,
  summary: Partial<FeatureViewNode> = {},
): FeatureViewNode {
  return {
    id: node.id,
    observedNode: node,
    kind,
    label:
      kind === "feature" ? "Feature" : kind === "unlinked" ? "Unlinked" : "Part",
    status: kind === "part" ? statusForPart(node) : node.status,
    evidenceCount: node.evidence.length,
    riskCount: node.risks.length,
    partCount: 0,
    verifiedPartCount: 0,
    riskyPartCount: 0,
    ...summary,
  };
}

function buildFeatureViewModel(graph: ObservedGraphState): FeatureViewModel {
  const productNodes = visibleProductNodes(graph.nodes);
  const features = productNodes.filter(isFeatureNode);
  const parts = productNodes.filter(isPartNode);
  const clusters = productNodes.filter(isUnlinkedNode);
  const productNodesById = new Map(productNodes.map((node) => [node.id, node]));
  const incomingEdgesByTarget = edgeMapByTarget(graph.edges);
  const partsByFeatureId = new Map<string, ObservedGraphNode[]>();

  parts.forEach((part) => {
    const feature = parentFeatureForPart(
      part,
      features,
      productNodesById,
      incomingEdgesByTarget,
    );

    if (!feature) {
      return;
    }

    partsByFeatureId.set(feature.id, [
      ...(partsByFeatureId.get(feature.id) ?? []),
      part,
    ]);
  });

  const nodes: CanvasNode[] = [];
  const edges: Edge[] = [];
  let cursorY = CANVAS_TOP;

  features.forEach((feature) => {
    const featureParts = partsByFeatureId.get(feature.id) ?? [];
    const summary = featureSummary(featureParts, clusters);
    const partsHeight =
      featureParts.length * NODE_SIZE.part.height +
      Math.max(featureParts.length - 1, 0) * PART_GAP;
    const groupHeight = Math.max(NODE_SIZE.feature.height, partsHeight);
    const featureY = cursorY + groupHeight / 2 - NODE_SIZE.feature.height / 2;
    const partStartY = cursorY + groupHeight / 2 - partsHeight / 2;
    const featureViewNode = toViewNode(feature, "feature", summary);

    nodes.push({
      id: feature.id,
      type: "observed",
      data: { viewNode: featureViewNode },
      position: { x: COLUMN_X.feature, y: featureY },
      selected: graph.selectedNodeId === feature.id,
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    });

    featureParts.forEach((part, index) => {
      const partViewNode = toViewNode(part, "part");

      nodes.push({
        id: part.id,
        type: "observed",
        data: { viewNode: partViewNode },
        position: {
          x: COLUMN_X.part,
          y: partStartY + index * (NODE_SIZE.part.height + PART_GAP),
        },
        selected: graph.selectedNodeId === part.id,
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      });
      edges.push({
        id: `feature_part_${feature.id}_${part.id}`,
        source: feature.id,
        target: part.id,
        type: "smoothstep",
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: "#d4d4d8",
          width: 16,
          height: 16,
        },
        style: { stroke: "#d4d4d8", strokeWidth: 2.2 },
      });
    });

    cursorY += groupHeight + GROUP_GAP;
  });

  clusters.forEach((cluster, index) => {
    nodes.push({
      id: cluster.id,
      type: "observed",
      data: { viewNode: toViewNode(cluster, "unlinked") },
      position: {
        x: COLUMN_X.unlinked,
        y: CANVAS_TOP + index * (NODE_SIZE.unlinked.height + UNLINKED_GAP),
      },
      selected: graph.selectedNodeId === cluster.id,
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    });
  });

  return {
    nodes,
    edges,
  };
}

function detailSummary(viewNode: FeatureViewNode) {
  if (viewNode.kind === "feature") {
    return `${viewNode.partCount} parts · ${viewNode.verifiedPartCount} verified · ${viewNode.riskyPartCount} risks`;
  }

  if (viewNode.kind === "part") {
    return `${viewNode.evidenceCount} evidence · ${viewNode.riskCount} risk`;
  }

  return "Unlinked product area";
}

function ObservedNodeCard({ data, selected }: NodeProps<CanvasNode>) {
  const viewNode = data.viewNode;
  const node = viewNode.observedNode;
  const tone = nodeTone[viewNode.kind];
  const Icon = tone.Icon;
  const label = statusLabel[viewNode.status];
  const badgeTone = statusBadgeTone[viewNode.status];
  const isFeature = viewNode.kind === "feature";

  return (
    <div
      className={`group cocanvas-node relative ${nodeSizeClass[viewNode.kind]} cursor-pointer overflow-visible rounded-[18px] border bg-white text-left text-zinc-900 ${tone.border} ${tone.shadow} px-[18px] py-4 transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_38px_rgba(24,24,27,0.13)] ${
        selected ? `ring-2 ${tone.ring} ring-offset-2` : ""
      }`}
      role="button"
      tabIndex={0}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!h-2.5 !w-2.5 !border-0 !bg-transparent"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!h-2.5 !w-2.5 !border-0 !bg-transparent"
      />
      <span
        aria-hidden="true"
        className={`absolute bottom-3 left-3 top-3 w-1 rounded-full ${tone.accent}`}
      />
      {viewNode.status === "building" ? (
        <span
          aria-label="Working"
          className="cocanvas-working-dot absolute right-4 top-4 h-3.5 w-3.5 rounded-full bg-emerald-400"
        />
      ) : null}
      <div className="flex items-start gap-3.5 pl-2">
        <div
          className={`grid shrink-0 place-items-center rounded-xl ${tone.icon} ${
            isFeature ? "h-12 w-12" : "h-11 w-11"
          }`}
        >
          <Icon className={isFeature ? "h-6 w-6" : "h-[22px] w-[22px]"} strokeWidth={2.2} />
        </div>
        <div className="min-w-0 flex-1 pr-5">
          <div
            className={`font-bold leading-snug tracking-normal ${
              isFeature ? "text-[19px]" : "text-[17px]"
            }`}
          >
            {node.title}
          </div>
          <div className="mt-1 text-[11px] font-bold uppercase text-zinc-500">
            {viewNode.label}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${badgeTone}`}
            >
              {label}
            </span>
            <span className="text-[12px] font-bold text-zinc-500">
              {detailSummary(viewNode)}
            </span>
          </div>
        </div>
      </div>
      {node.summary ? (
        <div className="pointer-events-none absolute left-0 top-[calc(100%+10px)] z-50 hidden w-[280px] rounded-2xl border border-zinc-200 bg-white/98 px-4 py-3 text-sm font-bold leading-5 text-zinc-700 shadow-[0_16px_42px_rgba(24,24,27,0.14)] group-hover:block">
          {node.summary}
        </div>
      ) : null}
    </div>
  );
}

const nodeTypes = {
  observed: ObservedNodeCard,
};

function FeatureCanvasInner({
  graph,
  onSelectNode,
  topControls,
  actionControls,
  chatPanel,
}: FeatureCanvasProps) {
  const { fitView } = useReactFlow<CanvasNode, Edge>();
  const didFitInitialNodes = useRef(false);
  const viewModel = useMemo(() => buildFeatureViewModel(graph), [graph]);

  useEffect(() => {
    if (viewModel.nodes.length === 0) {
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
  }, [fitView, viewModel.nodes.length]);

  return (
    <section className="relative h-screen min-h-[640px] overflow-hidden bg-white">
      <div className="absolute left-4 top-4 z-20 flex max-w-[calc(100%-2rem)] flex-wrap items-center gap-2">
        {topControls}
        <div className="hidden h-9 items-center gap-2 rounded-full border border-zinc-200 bg-white/95 px-3 text-[11px] font-bold text-zinc-600 shadow-sm md:flex">
          <span>Feature → Parts</span>
          <div className="mx-0.5 h-4 w-px bg-zinc-200" />
          <span>Click any part to see evidence and risks</span>
          <div className="mx-0.5 h-4 w-px bg-zinc-200" />
          <div className="flex items-center gap-1.5 text-zinc-500">
            <span className="cocanvas-working-dot h-2 w-2 rounded-full bg-emerald-400" />
            <span>Pulsing green dot = Codex is working here</span>
          </div>
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
        nodes={viewModel.nodes}
        edges={viewModel.edges}
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
