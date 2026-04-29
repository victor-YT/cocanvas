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
import {
  AlertTriangle,
  Boxes,
  Cpu,
  FileCheck,
  Layers,
  Route,
  type LucideIcon,
} from "lucide-react";
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

const nodeTypeLabel: Record<ObservedNodeType, string> = {
  feature: "Feature",
  flow: "Flow",
  capability: "Capability",
  evidence: "Evidence",
  risk: "Risk",
  cluster: "Unlinked Cluster",
};

const nodeTypeTone: Record<
  ObservedNodeType,
  {
    border: string;
    accent: string;
    icon: string;
    ring: string;
    shadow: string;
    Icon: LucideIcon;
  }
> = {
  feature: {
    border: "border-amber-300/70",
    accent: "bg-amber-400",
    icon: "bg-amber-50 text-amber-600",
    ring: "ring-amber-300/70",
    shadow: "shadow-[0_14px_34px_rgba(245,158,11,0.12)]",
    Icon: Layers,
  },
  flow: {
    border: "border-blue-300/70",
    accent: "bg-blue-400",
    icon: "bg-blue-50 text-blue-600",
    ring: "ring-blue-300/70",
    shadow: "shadow-[0_14px_34px_rgba(59,130,246,0.12)]",
    Icon: Route,
  },
  capability: {
    border: "border-violet-300/70",
    accent: "bg-violet-400",
    icon: "bg-violet-50 text-violet-600",
    ring: "ring-violet-300/70",
    shadow: "shadow-[0_14px_34px_rgba(139,92,246,0.12)]",
    Icon: Cpu,
  },
  evidence: {
    border: "border-emerald-300/70",
    accent: "bg-emerald-400",
    icon: "bg-emerald-50 text-emerald-600",
    ring: "ring-emerald-300/70",
    shadow: "shadow-[0_10px_26px_rgba(16,185,129,0.12)]",
    Icon: FileCheck,
  },
  risk: {
    border: "border-rose-300/80",
    accent: "bg-rose-400",
    icon: "bg-rose-50 text-rose-600",
    ring: "ring-rose-300/70",
    shadow: "shadow-[0_10px_26px_rgba(244,63,94,0.12)]",
    Icon: AlertTriangle,
  },
  cluster: {
    border: "border-purple-300/70",
    accent: "bg-purple-400",
    icon: "bg-purple-50 text-purple-600",
    ring: "ring-purple-300/70",
    shadow: "shadow-[0_14px_34px_rgba(168,85,247,0.12)]",
    Icon: Boxes,
  },
};

export const NODE_SIZE: Record<
  ObservedNodeType,
  { width: number; height: number }
> = {
  feature: { width: 260, height: 120 },
  flow: { width: 260, height: 110 },
  capability: { width: 280, height: 120 },
  evidence: { width: 240, height: 92 },
  risk: { width: 240, height: 92 },
  cluster: { width: 280, height: 120 },
};

const nodeSizeClass: Record<ObservedNodeType, string> = {
  feature: "w-[260px] min-h-[120px]",
  flow: "w-[260px] min-h-[110px]",
  capability: "w-[280px] min-h-[120px]",
  evidence: "w-[240px] min-h-[92px]",
  risk: "w-[240px] min-h-[92px]",
  cluster: "w-[280px] min-h-[120px]",
};

const nodeTypeLegendItems: ObservedNodeType[] = [
  "feature",
  "flow",
  "capability",
  "evidence",
  "risk",
  "cluster",
];

export const COLUMN_X: Record<ObservedNodeType, number> = {
  feature: 80,
  flow: 420,
  capability: 780,
  evidence: 1160,
  risk: 1160,
  cluster: 1540,
};

const ROW_GAP = 36;
const GROUP_GAP = 72;
const CANVAS_TOP = 150;
const ORPHAN_CENTER_Y = 330;

const layoutColumns: ObservedNodeType[][] = [
  ["feature"],
  ["flow"],
  ["capability"],
  ["evidence", "risk"],
  ["cluster"],
];

type NodePosition = { x: number; y: number };

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

function parentMapForGraph(
  nodes: ObservedGraphNode[],
  edges: ObservedGraphEdge[],
) {
  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  const parentsById = new Map<string, string[]>();

  edges.map(visualEdge).forEach((edge) => {
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
      parents.find((parentId) => nodesById.get(parentId)?.nodeType === "capability") ??
      parents[0]
    );
  }

  return parents[0];
}

function groupKeyForNode(
  node: ObservedGraphNode,
  columnIndex: number,
  parentId?: string,
) {
  const lane =
    node.nodeType === "evidence" || node.nodeType === "risk"
      ? "detail"
      : node.nodeType;

  return `${columnIndex}:${lane}:${parentId ?? "root"}`;
}

function nodeCenterY(node: ObservedGraphNode, position: NodePosition) {
  return position.y + NODE_SIZE[node.nodeType].height / 2;
}

function resolveColumnCollisions(
  nodes: ObservedGraphNode[],
  positionById: Map<string, NodePosition>,
  groupKeyById: Map<string, string>,
  orderById: Map<string, number>,
) {
  const nodesByColumn = new Map<number, ObservedGraphNode[]>();

  nodes.forEach((node) => {
    const x = positionById.get(node.id)?.x ?? COLUMN_X[node.nodeType];
    nodesByColumn.set(x, [...(nodesByColumn.get(x) ?? []), node]);
  });

  nodesByColumn.forEach((columnNodes) => {
    const groupsByKey = new Map<string, ObservedGraphNode[]>();
    let previousBottom: number | undefined;

    columnNodes.forEach((node) => {
      const groupKey = groupKeyById.get(node.id) ?? node.id;
      groupsByKey.set(groupKey, [...(groupsByKey.get(groupKey) ?? []), node]);
    });

    [...groupsByKey.values()]
      .map((groupNodes) => {
        const top = Math.min(
          ...groupNodes.map(
            (node) => positionById.get(node.id)?.y ?? ORPHAN_CENTER_Y,
          ),
        );
        const bottom = Math.max(
          ...groupNodes.map((node) => {
            const y = positionById.get(node.id)?.y ?? ORPHAN_CENTER_Y;
            return y + NODE_SIZE[node.nodeType].height;
          }),
        );
        const order = Math.min(
          ...groupNodes.map((node) => orderById.get(node.id) ?? 0),
        );

        return {
          nodes: groupNodes,
          top,
          bottom,
          order,
        };
      })
      .sort((groupA, groupB) => {
        if (groupA.top !== groupB.top) {
          return groupA.top - groupB.top;
        }

        return groupA.order - groupB.order;
      })
      .forEach((group) => {
        const minY =
          previousBottom === undefined ? CANVAS_TOP : previousBottom + GROUP_GAP;
        const offset = Math.max(0, minY - group.top);

        group.nodes.forEach((node) => {
          const current = positionById.get(node.id) ?? {
            x: COLUMN_X[node.nodeType],
            y: ORPHAN_CENTER_Y,
          };

          positionById.set(node.id, {
            ...current,
            y: current.y + offset,
          });
        });
        previousBottom = group.bottom + offset;
      });
  });
}

function placeColumnGroups(
  columnNodes: ObservedGraphNode[],
  columnIndex: number,
  positionById: Map<string, NodePosition>,
  groupKeyById: Map<string, string>,
  parentsById: Map<string, string[]>,
  nodesById: Map<string, ObservedGraphNode>,
) {
  const groups = new Map<
    string,
    { baseCenterY: number; nodes: ObservedGraphNode[] }
  >();

  columnNodes.forEach((node) => {
    const parentId = preferredParentId(node, parentsById, nodesById);
    const parentNode = parentId ? nodesById.get(parentId) : undefined;
    const parentPosition = parentId ? positionById.get(parentId) : undefined;
    const baseCenterY =
      parentNode && parentPosition
        ? nodeCenterY(parentNode, parentPosition)
        : node.nodeType === "cluster"
          ? CANVAS_TOP + NODE_SIZE.cluster.height / 2
          : ORPHAN_CENTER_Y;
    const groupKey = groupKeyForNode(
      node,
      columnIndex,
      parentPosition ? parentId : undefined,
    );
    const group = groups.get(groupKey) ?? {
      baseCenterY,
      nodes: [],
    };

    group.nodes.push(node);
    groups.set(groupKey, group);
    groupKeyById.set(node.id, groupKey);
  });

  groups.forEach((group) => {
    const totalHeight =
      group.nodes.reduce(
        (height, node) => height + NODE_SIZE[node.nodeType].height,
        0,
      ) +
      Math.max(group.nodes.length - 1, 0) * ROW_GAP;
    let y = group.baseCenterY - totalHeight / 2;

    group.nodes.forEach((node) => {
      positionById.set(node.id, {
        x: COLUMN_X[node.nodeType],
        y,
      });
      y += NODE_SIZE[node.nodeType].height + ROW_GAP;
    });
  });
}

export function layoutGraph(
  nodes: ObservedGraphNode[],
  edges: ObservedGraphEdge[],
) {
  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  const parentsById = parentMapForGraph(nodes, edges);
  const positionById = new Map<string, NodePosition>();
  const groupKeyById = new Map<string, string>();
  const orderById = new Map(nodes.map((node, index) => [node.id, index]));

  layoutColumns.forEach((columnTypes, columnIndex) => {
    const columnNodes = nodes.filter((node) =>
      columnTypes.includes(node.nodeType),
    );

    placeColumnGroups(
      columnNodes,
      columnIndex,
      positionById,
      groupKeyById,
      parentsById,
      nodesById,
    );
    resolveColumnCollisions(
      columnNodes,
      positionById,
      groupKeyById,
      orderById,
    );
  });

  return positionById;
}

function buildNodes(graph: ObservedGraphState, selectedNodeId?: string): CanvasNode[] {
  const positionById = layoutGraph(graph.nodes, graph.edges);

  return graph.nodes.map((node) => {
    return {
      id: node.id,
      type: "observed",
      data: { observedNode: node },
      position: positionById.get(node.id) ?? { x: 0, y: ORPHAN_CENTER_Y },
      selected: selectedNodeId === node.id,
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    };
  });
}

function edgeStyle(relation: string) {
  if (relation === "contains") {
    return { stroke: "#d4d4d8", strokeWidth: 2.1 };
  }

  if (relation === "enables") {
    return { stroke: "#60a5fa", strokeWidth: 2.2 };
  }

  if (relation === "supports") {
    return { stroke: "#34d399", strokeWidth: 2.4, strokeDasharray: "7 6" };
  }

  if (relation === "blocks") {
    return { stroke: "#fb7185", strokeWidth: 2.4, strokeDasharray: "7 6" };
  }

  if (relation === "related") {
    return { stroke: "#c084fc", strokeWidth: 2.1, strokeDasharray: "2 6" };
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
  const label = statusLabel[node.status];
  const badgeTone = statusBadgeTone[node.status];
  const typeTone = nodeTypeTone[node.nodeType];
  const Icon = typeTone.Icon;
  const isCompact = node.nodeType === "evidence" || node.nodeType === "risk";

  return (
    <div
      className={`group cocanvas-node relative ${nodeSizeClass[node.nodeType]} cursor-pointer overflow-visible rounded-[18px] border bg-white text-left text-zinc-900 ${typeTone.border} ${typeTone.shadow} transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_38px_rgba(24,24,27,0.13)] ${
        isCompact ? "px-4 py-3.5" : "px-[18px] py-4"
      } ${
        selected ? `ring-2 ${typeTone.ring} ring-offset-2` : ""
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
        className={`absolute bottom-3 left-3 top-3 w-1 rounded-full ${typeTone.accent}`}
      />
      {node.status === "building" ? (
        <span
          aria-label="Working"
          className="cocanvas-working-dot absolute right-4 top-4 h-3.5 w-3.5 rounded-full bg-emerald-400"
        />
      ) : null}
      <div className={`flex items-start ${isCompact ? "gap-3 pl-2" : "gap-3.5 pl-2"}`}>
        <div
          className={`grid shrink-0 place-items-center rounded-xl ${typeTone.icon} ${
            isCompact ? "h-9 w-9" : "h-11 w-11"
          }`}
        >
          <Icon className={isCompact ? "h-[18px] w-[18px]" : "h-[22px] w-[22px]"} strokeWidth={2.2} />
        </div>
        <div className="min-w-0 flex-1 pr-5">
          <div
            className={`truncate font-semibold tracking-normal ${
              isCompact ? "text-[15px] leading-5" : "text-[17px] leading-6"
            }`}
          >
            {node.title}
          </div>
          <div className="mt-1 text-[11px] font-semibold uppercase text-zinc-500">
            {nodeTypeLabel[node.nodeType]}
          </div>
          <div
            className={`mt-3 inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${
              badgeTone
            } ${isCompact ? "mt-2" : ""}`}
          >
            {label}
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
        <div className="hidden h-9 items-center gap-2 rounded-full border border-zinc-200 bg-white/95 px-3 text-[11px] font-semibold text-zinc-600 shadow-sm md:flex">
          {nodeTypeLegendItems.map((nodeType) => {
            const typeTone = nodeTypeTone[nodeType];
            const Icon = typeTone.Icon;

            return (
              <div key={nodeType} className="flex items-center gap-1.5">
                <span className={`grid h-5 w-5 place-items-center rounded-lg ${typeTone.icon}`}>
                  <Icon className="h-3.5 w-3.5" strokeWidth={2.3} />
                </span>
                <span>{nodeType === "cluster" ? "Cluster" : nodeTypeLabel[nodeType]}</span>
              </div>
            );
          })}
          <div className="mx-0.5 h-4 w-px bg-zinc-200" />
          <div className="flex items-center gap-1.5 text-zinc-500">
            <span className="cocanvas-working-dot h-2 w-2 rounded-full bg-emerald-400" />
            <span>Pulsing green dot = Codex is working</span>
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
