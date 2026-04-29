"use client";

import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
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
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import {
  AlertTriangle,
  AtSign,
  Bot,
  CheckCircle2,
  ChevronDown,
  FileCode2,
  FolderOpen,
  MoreHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import type {
  ObservedGraphEdge,
  ObservedGraphNode,
  ObservedGraphState,
} from "@/lib/types/observedGraph";

type FeatureCanvasProps = {
  graph: ObservedGraphState;
  selectedNodeId?: string;
  onSelectNode: (id: string) => void;
  onClearSelectedNode?: () => void;
  onMentionNode?: (node: ObservedGraphNode) => void;
  onAskCodexAboutNode?: (node: ObservedGraphNode) => void;
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
    .map((node): CanvasNode | undefined => {
      const position = layout.positions.get(node.id);

      if (!position) {
        return undefined;
      }

      const viewNode: FeatureViewNode = {
        observedNode: node,
        status: displayStatus(node),
        childrenCount: layout.childCountById.get(node.id) ?? 0,
        evidenceCount: node.evidence.length,
        riskCount: node.risks.length,
      };

      return {
        id: node.id,
        type: "feature" as const,
        data: { viewNode },
        position,
        selected: graph.selectedNodeId === node.id,
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      };
    })
    .filter((node): node is CanvasNode => node !== undefined);
}

function buildEdges(graph: ObservedGraphState): Edge[] {
  return layoutHierarchy(graph).edges;
}

function countText(viewNode: FeatureViewNode) {
  const fileCount = viewNode.observedNode.relatedFiles.length;
  const primary =
    fileCount > 0
      ? `${fileCount} file${fileCount === 1 ? "" : "s"}`
      : `${viewNode.childrenCount} feature${viewNode.childrenCount === 1 ? "" : "s"}`;
  const riskText =
    viewNode.riskCount > 0
      ? `${viewNode.riskCount} risk${viewNode.riskCount === 1 ? "" : "s"}`
      : "No risks";

  return `${primary} · ${riskText}`;
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

function sourceLabel(node: ObservedGraphNode) {
  const rawSummary = node.summary?.toLowerCase() ?? "";

  if (rawSummary.includes("repository scan") || rawSummary.includes("repository snapshot")) {
    return "Imported snapshot";
  }

  if (node.rawEvents.some((event) => event.type === "node.upsert")) {
    return "Observed graph";
  }

  return "Observed";
}

function summaryText(node: ObservedGraphNode) {
  const summary = node.summary?.trim();

  if (!summary || summary === "Imported from the current repository snapshot.") {
    return "Observed from repository scan.";
  }

  return summary.replace(
    "Imported from the current repository snapshot.",
    "Observed from repository scan.",
  );
}

function statusTone(status: FeatureBadgeStatus) {
  return statusBadgeTone[status];
}

function Section({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <section className="border-t border-zinc-100 px-4 py-4">
      <h3 className="text-[13px] font-bold text-zinc-950">{title}</h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function InspectorAction({
  children,
  disabled,
  onClick,
}: {
  children: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-full border border-zinc-200 bg-white px-3.5 text-xs font-bold text-zinc-800 shadow-sm transition-[transform,box-shadow,background-color] duration-150 hover:scale-[1.02] hover:bg-zinc-50 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:scale-100"
    >
      {children}
    </button>
  );
}

function Inspector({
  node,
  onAskCodex,
  onClose,
  onMention,
}: {
  node?: ObservedGraphNode;
  onAskCodex?: (node: ObservedGraphNode) => void;
  onClose?: () => void;
  onMention?: (node: ObservedGraphNode) => void;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [height, setHeight] = useState(0);

  useLayoutEffect(() => {
    const content = contentRef.current;

    if (!node || !content) {
      setHeight(0);
      return;
    }

    function updateHeight() {
      if (!content) {
        return;
      }

      setHeight(Math.min(content.scrollHeight, 520));
    }

    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(content);

    return () => observer.disconnect();
  }, [advancedOpen, node]);

  if (!node) {
    return null;
  }

  const status = displayStatus(node);
  const hasRisks = node.risks.length > 0;
  const hasFiles = node.relatedFiles.length > 0;
  const hasEvidence = node.evidence.length > 0;

  return (
    <aside
      className="pointer-events-auto absolute right-5 top-1/2 z-30 w-[320px] -translate-y-1/2 overflow-hidden rounded-[22px] border border-zinc-200 bg-white/96 text-zinc-900 shadow-[0_18px_48px_rgba(24,24,27,0.14)] backdrop-blur transition-[height,opacity,transform] duration-300 ease-out"
      style={{ height }}
    >
      <div className="h-full overflow-y-auto">
        <div ref={contentRef}>
          <div className="px-4 pb-4 pt-4">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-zinc-200 bg-zinc-50 text-zinc-800 shadow-sm">
                <Sparkles className="h-4 w-4" strokeWidth={2.2} />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-base font-bold leading-tight text-zinc-950">
                    {node.title}
                  </h2>
                  <button
                    type="button"
                    aria-label="Close feature details"
                    onClick={onClose}
                    className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-full text-zinc-400 transition hover:scale-[1.03] hover:bg-zinc-100 hover:text-zinc-700"
                  >
                    <X className="h-4 w-4" strokeWidth={2.4} />
                  </button>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${statusTone(status)}`}
                  >
                    {statusLabel[status]}
                  </span>
                  <span className="inline-flex rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-bold text-zinc-600">
                    {sourceLabel(node)}
                  </span>
                </div>

                <p className="mt-3 text-xs font-semibold leading-5 text-zinc-600">
                  {summaryText(node)}
                </p>
              </div>
            </div>
          </div>

          <Section title="Health">
            <div className="flex items-center gap-3 rounded-2xl bg-zinc-50 px-4 py-3">
              <div
                className={`grid h-9 w-9 place-items-center rounded-full ${
                  hasRisks
                    ? "bg-rose-50 text-rose-600"
                    : "bg-emerald-50 text-emerald-600"
                }`}
              >
                {hasRisks ? (
                  <AlertTriangle className="h-4 w-4" strokeWidth={2.4} />
                ) : (
                  <CheckCircle2 className="h-4 w-4" strokeWidth={2.4} />
                )}
              </div>
              <div>
                <div className="text-sm font-bold text-zinc-950">
                  {hasRisks
                    ? `${node.risks.length} risk${
                        node.risks.length === 1 ? "" : "s"
                      } need attention`
                    : "No risks observed"}
                </div>
                <div className="mt-0.5 text-xs font-semibold text-zinc-500">
                  {hasRisks
                    ? "Review the risk detail before asking Codex to continue."
                    : "No blocking issue is attached to this feature."}
                </div>
              </div>
            </div>
          </Section>

          {hasFiles ? (
            <Section title="Implementation">
              <div className="grid gap-2">
                {node.relatedFiles.map((file) => (
                  <div
                    key={file}
                    className="inline-flex min-w-0 items-center gap-2 rounded-2xl bg-zinc-50 px-3 py-2 text-xs font-bold text-zinc-700 ring-1 ring-inset ring-zinc-100"
                  >
                    <FileCode2
                      className="h-3.5 w-3.5 shrink-0 text-zinc-400"
                      strokeWidth={2.2}
                    />
                    <code className="min-w-0 break-all font-mono text-[11px] font-semibold">
                      {file}
                    </code>
                  </div>
                ))}
              </div>
            </Section>
          ) : null}

          {hasEvidence ? (
            <Section title="Evidence">
              <div className="grid gap-2">
                {node.evidence.map((evidence) => (
                  <div
                    key={evidence.id}
                    className="rounded-2xl bg-emerald-50/70 px-3.5 py-3 text-sm font-semibold leading-5 text-emerald-900 ring-1 ring-inset ring-emerald-100"
                  >
                    {evidence.summary}
                    {evidence.path ? (
                      <div className="mt-1 break-all font-mono text-[11px] font-semibold text-emerald-700/80">
                        {evidence.path}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </Section>
          ) : null}

          {hasRisks ? (
            <Section title="Risks">
              <div className="grid gap-2">
                {node.risks.map((risk) => (
                  <div
                    key={risk.id}
                    className="rounded-2xl bg-rose-50/70 px-3.5 py-3 text-sm font-semibold leading-5 text-rose-900 ring-1 ring-inset ring-rose-100"
                  >
                    {risk.summary}
                    <div className="mt-1 text-[11px] font-bold uppercase tracking-wide text-rose-600">
                      {risk.severity} severity
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          ) : null}

          <Section title="Actions">
            <div className="flex flex-wrap gap-2">
              <InspectorAction onClick={() => onMention?.(node)}>
                <AtSign className="h-3.5 w-3.5" strokeWidth={2.4} />
                Mention
              </InspectorAction>
              <InspectorAction onClick={() => onAskCodex?.(node)}>
                <Bot className="h-3.5 w-3.5" strokeWidth={2.4} />
                Ask Codex
              </InspectorAction>
              <InspectorAction disabled={!hasFiles}>
                <FolderOpen className="h-3.5 w-3.5" strokeWidth={2.4} />
                Open file
              </InspectorAction>
              <InspectorAction>
                <MoreHorizontal className="h-3.5 w-3.5" strokeWidth={2.4} />
              </InspectorAction>
            </div>
          </Section>

          <div className="border-t border-zinc-100 px-4 py-4">
            <button
              type="button"
              onClick={() => setAdvancedOpen((current) => !current)}
              className="flex w-full cursor-pointer items-center justify-between text-left text-[13px] font-bold text-zinc-700 transition hover:text-zinc-950"
            >
              <span>Advanced</span>
              <ChevronDown
                className={`h-4 w-4 transition-transform duration-200 ${
                  advancedOpen ? "rotate-180" : ""
                }`}
                strokeWidth={2.4}
              />
            </button>
            {advancedOpen ? (
              <div className="mt-3 rounded-2xl bg-zinc-50 px-3.5 py-3 text-xs font-semibold leading-5 text-zinc-500">
                {node.rawEvents.length} graph event
                {node.rawEvents.length === 1 ? "" : "s"} attached.
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </aside>
  );
}

function FeatureCanvasInner({
  graph,
  onAskCodexAboutNode,
  onClearSelectedNode,
  onMentionNode,
  onSelectNode,
  topControls,
  actionControls,
  runStatusBar,
  chatPanel,
}: FeatureCanvasProps) {
  const nodes = useMemo(() => buildNodes(graph), [graph]);
  const edges = useMemo(() => buildEdges(graph), [graph]);
  const selectedNode = graph.nodes.find((node) => node.id === graph.selectedNodeId);

  return (
    <section className="relative h-screen min-h-[640px] overflow-hidden bg-white">
      <div className="absolute left-4 top-4 z-20 flex max-w-[calc(100%-2rem)] flex-wrap items-center gap-2">
        {topControls}
      </div>

      <div className="absolute right-4 top-4 z-30 flex flex-wrap justify-end gap-2">
        {actionControls}
      </div>

      <Inspector
        key={selectedNode?.id ?? "empty"}
        node={selectedNode}
        onAskCodex={onAskCodexAboutNode}
        onClose={onClearSelectedNode}
        onMention={onMentionNode}
      />

      {runStatusBar || chatPanel ? (
        <div
          className="pointer-events-none absolute bottom-6 left-5 right-5 z-30 flex flex-col items-center justify-center gap-3"
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
