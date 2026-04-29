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
import type {
  ObservedGraphEdge,
  ObservedGraphNode,
  ObservedGraphState,
} from "@/lib/types/observedGraph";

type FeatureCanvasProps = {
  graph: ObservedGraphState;
  selectedNodeId?: string;
  onSelectNode: (id: string) => void;
  topControls?: ReactNode;
  actionControls?: ReactNode;
  runStatusBar?: ReactNode;
  chatPanel?: ReactNode;
};

type FeatureViewNode = {
  observedNode: ObservedGraphNode;
  status: FeatureBadgeStatus;
  childrenCount: number;
  evidenceCount: number;
  riskCount: number;
};

type CanvasNodeData = {
  viewNode: FeatureViewNode;
};

type CanvasNode = Node<CanvasNodeData, "feature">;

type FeatureBadgeStatus = "building" | "implemented" | "verified" | "risk";

type HierarchyNode = {
  node: ObservedGraphNode;
  depth: number;
  children: HierarchyNode[];
};

const statusLabel: Record<FeatureBadgeStatus, string> = {
  building: "Building",
  implemented: "Implemented",
  verified: "Verified",
  risk: "Risk",
};

const statusBadgeTone: Record<FeatureBadgeStatus, string> = {
  building: "bg-emerald-50 text-emerald-700",
  implemented: "bg-blue-50 text-blue-700",
  verified: "bg-emerald-50 text-emerald-700",
  risk: "bg-rose-50 text-rose-700",
};

const MIN_NODE_HEIGHT = 112;
const COLUMN_GAP = 390;
const ROW_GAP = 34;
const ROOT_GAP = 92;
const CANVAS_LEFT = 120;
const CANVAS_TOP = 170;

function isVisibleFeatureNode(node: ObservedGraphNode) {
  return node.nodeType !== "evidence" && node.nodeType !== "risk";
}

function displayStatus(node: ObservedGraphNode): FeatureBadgeStatus {
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

  return "implemented";
}

function nodeHeight(node: ObservedGraphNode) {
  const titleLines = Math.max(1, Math.ceil(node.title.length / 28));

  return MIN_NODE_HEIGHT + (titleLines - 1) * 22;
}

function containsEdges(edges: ObservedGraphEdge[], nodeIds: Set<string>) {
  return edges.filter(
    (edge) =>
      edge.relation === "contains" &&
      nodeIds.has(edge.from) &&
      nodeIds.has(edge.to),
  );
}

function buildHierarchy(nodes: ObservedGraphNode[], edges: ObservedGraphEdge[]) {
  const visibleNodes = nodes.filter(isVisibleFeatureNode);
  const visibleNodeIds = new Set(visibleNodes.map((node) => node.id));
  const edgesByParent = new Map<string, ObservedGraphEdge[]>();
  const childIds = new Set<string>();

  containsEdges(edges, visibleNodeIds).forEach((edge) => {
    edgesByParent.set(edge.from, [...(edgesByParent.get(edge.from) ?? []), edge]);
    childIds.add(edge.to);
  });

  const nodesById = new Map(visibleNodes.map((node) => [node.id, node]));
  const roots = visibleNodes.filter((node) => !childIds.has(node.id));

  function visit(node: ObservedGraphNode, depth: number, path: Set<string>): HierarchyNode {
    const childEdges = edgesByParent.get(node.id) ?? [];
    const children = childEdges
      .map((edge) => nodesById.get(edge.to))
      .filter((child): child is ObservedGraphNode => Boolean(child))
      .filter((child) => !path.has(child.id))
      .map((child) => visit(child, depth + 1, new Set([...path, child.id])));

    return {
      node,
      depth,
      children,
    };
  }

  return roots.map((root) => visit(root, 0, new Set([root.id])));
}

function subtreeHeight(tree: HierarchyNode): number {
  const ownHeight = nodeHeight(tree.node);

  if (tree.children.length === 0) {
    return ownHeight;
  }

  const childHeight =
    tree.children.reduce((height, child) => height + subtreeHeight(child), 0) +
    Math.max(tree.children.length - 1, 0) * ROW_GAP;

  return Math.max(ownHeight, childHeight);
}

function layoutHierarchy(graph: ObservedGraphState) {
  const roots = buildHierarchy(graph.nodes, graph.edges);
  const positions = new Map<string, { x: number; y: number }>();
  const childCountById = new Map<string, number>();
  const edges: Edge[] = [];
  let cursorY = CANVAS_TOP;

  function place(tree: HierarchyNode, top: number): void {
    const height = subtreeHeight(tree);
    const ownHeight = nodeHeight(tree.node);
    const x = CANVAS_LEFT + tree.depth * COLUMN_GAP;

    childCountById.set(tree.node.id, tree.children.length);

    if (tree.children.length === 0) {
      positions.set(tree.node.id, {
        x,
        y: top,
      });
      return;
    }

    const childrenHeight =
      tree.children.reduce((total, child) => total + subtreeHeight(child), 0) +
      Math.max(tree.children.length - 1, 0) * ROW_GAP;
    let childTop = top + height / 2 - childrenHeight / 2;

    tree.children.forEach((child) => {
      place(child, childTop);
      childTop += subtreeHeight(child) + ROW_GAP;
      edges.push({
        id: `contains_${tree.node.id}_${child.node.id}`,
        source: tree.node.id,
        target: child.node.id,
        type: "smoothstep",
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: "#c7c9cf",
          width: 16,
          height: 16,
        },
        style: { stroke: "#c7c9cf", strokeWidth: 2.2 },
      });
    });

    positions.set(tree.node.id, {
      x,
      y: top + height / 2 - ownHeight / 2,
    });
  }

  roots.forEach((root) => {
    place(root, cursorY);
    cursorY += subtreeHeight(root) + ROOT_GAP;
  });

  return {
    positions,
    childCountById,
    edges,
  };
}

function buildNodes(graph: ObservedGraphState): CanvasNode[] {
  const layout = layoutHierarchy(graph);

  return graph.nodes
    .filter(isVisibleFeatureNode)
    .map((node) => {
      const viewNode: FeatureViewNode = {
        observedNode: node,
        status: displayStatus(node),
        childrenCount: layout.childCountById.get(node.id) ?? 0,
        evidenceCount: node.evidence.length,
        riskCount: node.risks.length,
      };

      return {
        id: node.id,
        type: "feature",
        data: { viewNode },
        position: layout.positions.get(node.id) ?? { x: CANVAS_LEFT, y: CANVAS_TOP },
        selected: graph.selectedNodeId === node.id,
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      };
    });
}

function buildEdges(graph: ObservedGraphState): Edge[] {
  return layoutHierarchy(graph).edges;
}

function countText(viewNode: FeatureViewNode) {
  return `${viewNode.childrenCount} children · ${viewNode.evidenceCount} evidence · ${viewNode.riskCount} risk`;
}

function FeatureNodeCard({ data, selected }: NodeProps<CanvasNode>) {
  const viewNode = data.viewNode;
  const node = viewNode.observedNode;
  const status = viewNode.status;

  return (
    <div
      className={`group cocanvas-node relative w-[300px] cursor-pointer overflow-visible rounded-[18px] border border-zinc-200 bg-white px-5 py-4 text-left text-zinc-900 shadow-[0_12px_30px_rgba(24,24,27,0.08)] transition duration-200 hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-[0_16px_38px_rgba(24,24,27,0.12)] ${
        selected ? "ring-2 ring-zinc-300 ring-offset-2" : ""
      }`}
      role="button"
      tabIndex={0}
      style={{ minHeight: nodeHeight(node) }}
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
        className="absolute bottom-3 left-3 top-3 w-1 rounded-full bg-zinc-200"
      />
      {status === "building" ? (
        <span
          aria-label="Working"
          className="cocanvas-working-dot absolute right-4 top-4 h-3.5 w-3.5 rounded-full bg-emerald-400"
        />
      ) : null}
      <div className="pl-2 pr-4">
        <div className="text-[17px] font-bold leading-snug tracking-normal">
          {node.title}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${statusBadgeTone[status]}`}
          >
            {statusLabel[status]}
          </span>
          <span className="text-[12px] font-bold text-zinc-500">
            {countText(viewNode)}
          </span>
        </div>
      </div>
    </div>
  );
}

const nodeTypes = {
  feature: FeatureNodeCard,
};

function Inspector({ node }: { node?: ObservedGraphNode }) {
  if (!node) {
    return null;
  }

  return (
    <aside className="pointer-events-auto absolute bottom-[236px] right-5 z-30 w-[320px] rounded-[22px] border border-zinc-200 bg-white/96 p-4 text-zinc-900 shadow-[0_18px_48px_rgba(24,24,27,0.14)] backdrop-blur">
      <div className="text-sm font-bold">{node.title}</div>
      <div className="mt-1 text-xs font-bold text-zinc-500">
        Status: {statusLabel[displayStatus(node)]}
      </div>
      {node.summary ? (
        <p className="mt-3 text-xs font-semibold leading-5 text-zinc-600">
          {node.summary}
        </p>
      ) : null}
      <div className="mt-4 grid gap-3 text-xs font-semibold text-zinc-600">
        <div>
          <div className="font-bold text-zinc-900">Evidence</div>
          {node.evidence.length > 0 ? (
            <ul className="mt-1 grid gap-1">
              {node.evidence.map((evidence) => (
                <li key={evidence.id}>{evidence.summary}</li>
              ))}
            </ul>
          ) : (
            <div className="mt-1 text-zinc-400">No evidence yet.</div>
          )}
        </div>
        <div>
          <div className="font-bold text-zinc-900">Risks</div>
          {node.risks.length > 0 ? (
            <ul className="mt-1 grid gap-1">
              {node.risks.map((risk) => (
                <li key={risk.id}>{risk.summary}</li>
              ))}
            </ul>
          ) : (
            <div className="mt-1 text-zinc-400">No risks observed.</div>
          )}
        </div>
        {node.relatedFiles.length > 0 ? (
          <div>
            <div className="font-bold text-zinc-900">Related files</div>
            <ul className="mt-1 grid gap-1">
              {node.relatedFiles.map((file) => (
                <li key={file} className="break-all">
                  {file}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {node.rawEvents.length > 0 ? (
          <div>
            <div className="font-bold text-zinc-900">Raw events</div>
            <div className="mt-1 text-zinc-400">
              {node.rawEvents.length} graph events attached.
            </div>
          </div>
        ) : null}
      </div>
    </aside>
  );
}

function FeatureCanvasInner({
  graph,
  onSelectNode,
  topControls,
  actionControls,
  runStatusBar,
  chatPanel,
}: FeatureCanvasProps) {
  const { fitView } = useReactFlow<CanvasNode, Edge>();
  const didFitInitialNodes = useRef(false);
  const nodes = useMemo(() => buildNodes(graph), [graph]);
  const edges = useMemo(() => buildEdges(graph), [graph]);
  const selectedNode = graph.nodes.find((node) => node.id === graph.selectedNodeId);

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
      </div>

      <div className="absolute right-4 top-4 z-30 flex flex-wrap justify-end gap-2">
        {actionControls}
      </div>

      <Inspector node={selectedNode} />

      {runStatusBar || chatPanel ? (
        <div
          className="pointer-events-none absolute bottom-5 left-5 right-5 z-30 flex flex-col items-center justify-center gap-2"
        >
          {runStatusBar}
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
