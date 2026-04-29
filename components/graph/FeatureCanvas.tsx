"use client";

import {
  useMemo,
  useState,
  type PointerEvent,
  type WheelEvent,
} from "react";
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
};

type CanvasPoint = {
  x: number;
  y: number;
};

type Viewport = CanvasPoint & {
  zoom: number;
};

const BOARD_WIDTH = 1500;
const BOARD_HEIGHT = 920;
const NODE_WIDTH = 250;

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

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function defaultPosition(node: ObservedGraphNode, index: number): CanvasPoint {
  if (node.nodeType === "feature") {
    return { x: 120, y: 250 };
  }

  if (node.nodeType === "flow") {
    return { x: 455, y: 120 + index * 128 };
  }

  if (node.nodeType === "capability") {
    return { x: 455, y: 420 + index * 128 };
  }

  if (node.nodeType === "evidence") {
    return { x: 840, y: 420 + index * 112 };
  }

  if (node.nodeType === "risk") {
    return { x: 840, y: 260 + index * 112 };
  }

  return { x: 120, y: 620 + index * 122 };
}

function buildPositions(nodes: ObservedGraphNode[]) {
  const typeCounts: Partial<Record<ObservedNodeType, number>> = {};

  return nodes.reduce<Record<string, CanvasPoint>>((positions, node) => {
    const index = typeCounts[node.nodeType] ?? 0;
    typeCounts[node.nodeType] = index + 1;
    positions[node.id] = defaultPosition(node, index);
    return positions;
  }, {});
}

function ObservedNodeCard({
  node,
  selected,
  onSelect,
}: {
  node: ObservedGraphNode;
  selected: boolean;
  onSelect: () => void;
}) {
  const tone = statusTone[node.status];

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`w-[250px] rounded-xl border px-4 py-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg ${tone.card} ${
        selected ? "ring-2 ring-zinc-950 ring-offset-2" : ""
      }`}
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
    </button>
  );
}

function CanvasEdge({
  from,
  to,
  label,
  tone,
}: {
  from: CanvasPoint;
  to: CanvasPoint;
  label?: string;
  tone: string;
}) {
  const startX = from.x + NODE_WIDTH;
  const startY = from.y + 55;
  const endX = to.x;
  const endY = to.y + 55;
  const midX = startX + Math.max(80, (endX - startX) / 2);
  const d = `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`;

  return (
    <g>
      <path
        d={d}
        className={`${tone} fill-none`}
        strokeWidth="2"
        strokeLinecap="round"
      />
      {label ? (
        <text
          x={(startX + endX) / 2}
          y={(startY + endY) / 2 - 8}
          className="fill-zinc-400 text-[11px] font-medium"
        >
          {label}
        </text>
      ) : null}
    </g>
  );
}

function edgeTone(relation: string) {
  if (relation === "supports") {
    return "stroke-emerald-300";
  }

  if (relation === "blocks") {
    return "stroke-rose-300";
  }

  if (relation === "enables") {
    return "stroke-blue-300";
  }

  return "stroke-zinc-300";
}

export function FeatureCanvas({
  graph,
  selectedNodeId,
  onSelectNode,
}: FeatureCanvasProps) {
  const [viewport, setViewport] = useState<Viewport>({ x: 64, y: 70, zoom: 0.82 });
  const [panStart, setPanStart] = useState<{
    pointerId: number;
    start: CanvasPoint;
    origin: CanvasPoint;
  }>();
  const positions = useMemo(() => buildPositions(graph.nodes), [graph.nodes]);
  const selectedNode = graph.nodes.find((node) => node.id === selectedNodeId);

  function zoomTo(nextZoom: number) {
    setViewport((current) => ({
      ...current,
      zoom: clamp(nextZoom, 0.45, 1.55),
    }));
  }

  function handleWheel(event: WheelEvent<HTMLDivElement>) {
    event.preventDefault();
    zoomTo(viewport.zoom * (event.deltaY > 0 ? 0.92 : 1.08));
  }

  function handlePanStart(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    setPanStart({
      pointerId: event.pointerId,
      start: { x: event.clientX, y: event.clientY },
      origin: { x: viewport.x, y: viewport.y },
    });
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (panStart?.pointerId !== event.pointerId) {
      return;
    }

    setViewport({
      ...viewport,
      x: panStart.origin.x + event.clientX - panStart.start.x,
      y: panStart.origin.y + event.clientY - panStart.start.y,
    });
  }

  function handlePointerEnd(event: PointerEvent<HTMLDivElement>) {
    if (panStart?.pointerId === event.pointerId) {
      setPanStart(undefined);
    }
  }

  return (
    <section className="relative min-h-[640px] overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm lg:min-h-[calc(100vh-120px)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,#d7d8d2_1px,transparent_0)] bg-[size:24px_24px]" />

      <div className="absolute left-4 top-4 z-20 flex max-w-[calc(100%-2rem)] flex-wrap items-center gap-2">
        <div className="rounded-xl border border-zinc-200 bg-white/95 px-3 py-2 shadow-sm">
          <h2 className="text-sm font-semibold text-zinc-900">Observed Feature Graph</h2>
          <p className="text-xs text-zinc-500">
            {graph.nodes.length} nodes, {graph.edges.length} edges
          </p>
        </div>
        <div className="hidden items-center gap-3 rounded-xl border border-zinc-200 bg-white/95 px-3 py-2 text-xs text-zinc-600 shadow-sm md:flex">
          {Object.entries(statusTone).map(([status, tone]) => (
            <div key={status} className="flex items-center gap-1.5">
              <span className={`h-2.5 w-2.5 rounded-full ${tone.dot}`} />
              <span>{tone.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute right-4 top-4 z-20 flex items-center gap-1 rounded-xl border border-zinc-200 bg-white/95 p-1 shadow-sm">
        <button
          type="button"
          title="Zoom out"
          onClick={() => zoomTo(viewport.zoom - 0.12)}
          className="grid h-8 w-8 place-items-center rounded-lg text-sm font-semibold text-zinc-700 hover:bg-zinc-100"
        >
          -
        </button>
        <span className="min-w-12 text-center text-xs font-medium text-zinc-500">
          {Math.round(viewport.zoom * 100)}%
        </span>
        <button
          type="button"
          title="Zoom in"
          onClick={() => zoomTo(viewport.zoom + 0.12)}
          className="grid h-8 w-8 place-items-center rounded-lg text-sm font-semibold text-zinc-700 hover:bg-zinc-100"
        >
          +
        </button>
        <button
          type="button"
          title="Reset view"
          onClick={() => setViewport({ x: 64, y: 70, zoom: 0.82 })}
          className="h-8 rounded-lg px-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
        >
          Fit
        </button>
      </div>

      {selectedNode ? (
        <div className="absolute bottom-4 left-4 z-20 max-w-sm rounded-xl border border-zinc-200 bg-white/95 p-3 shadow-sm">
          <div className="text-xs font-medium uppercase text-zinc-500">Selected</div>
          <div className="mt-1 text-sm font-semibold text-zinc-900">
            {selectedNode.title}
          </div>
          <p className="mt-1 text-xs leading-5 text-zinc-500">
            {selectedNode.summary ?? nodeTypeLabel[selectedNode.nodeType]}
          </p>
        </div>
      ) : null}

      {graph.nodes.length === 0 ? (
        <div className="relative z-10 grid h-full min-h-[640px] place-items-center p-8 text-center">
          <div className="rounded-2xl border border-dashed border-zinc-300 bg-white/90 p-8 shadow-sm">
            <p className="text-sm font-semibold text-zinc-900">Blank canvas</p>
            <p className="mt-1 max-w-sm text-sm text-zinc-500">
              Run Demo Replay to append graph events and grow the observed feature map.
            </p>
          </div>
        </div>
      ) : (
        <div
          className={`relative z-10 h-full min-h-[640px] touch-none overflow-hidden ${
            panStart ? "cursor-grabbing" : "cursor-grab"
          }`}
          onPointerDown={handlePanStart}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
          onWheel={handleWheel}
        >
          <div
            className="absolute left-0 top-0"
            style={{
              width: BOARD_WIDTH,
              height: BOARD_HEIGHT,
              transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
              transformOrigin: "0 0",
            }}
          >
            <svg
              className="pointer-events-none absolute inset-0"
              width={BOARD_WIDTH}
              height={BOARD_HEIGHT}
              aria-hidden="true"
            >
              {graph.edges.map((edge) => {
                const from = positions[edge.from];
                const to = positions[edge.to];

                if (!from || !to) {
                  return null;
                }

                return (
                  <CanvasEdge
                    key={edge.id}
                    from={from}
                    to={to}
                    label={edge.label ?? edge.relation}
                    tone={edgeTone(edge.relation)}
                  />
                );
              })}
            </svg>

            {graph.nodes.map((node) => (
              <div
                key={node.id}
                className="absolute w-[250px]"
                style={{
                  transform: `translate(${positions[node.id]?.x ?? 0}px, ${
                    positions[node.id]?.y ?? 0
                  }px)`,
                }}
                onPointerDown={(event) => event.stopPropagation()}
              >
                <ObservedNodeCard
                  node={node}
                  selected={selectedNodeId === node.id}
                  onSelect={() => onSelectNode(node.id)}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
