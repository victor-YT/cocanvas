"use client";

import {
  useMemo,
  useRef,
  useState,
  type PointerEvent,
  type ReactNode,
  type WheelEvent,
} from "react";
import type {
  ArtifactRef,
  FeatureNode as FeatureNodeType,
  GraphState,
} from "@/lib/types/graph";
import { ArtifactNode } from "./ArtifactNode";
import { FeatureNode } from "./FeatureNode";
import { GraphLegend } from "./GraphLegend";

type FeatureCanvasProps = {
  graph: GraphState;
  selectedNodeId?: string;
  onSelectNode: (id: string) => void;
  chatPanel?: ReactNode;
};

type CanvasPoint = {
  x: number;
  y: number;
};

type Viewport = CanvasPoint & {
  zoom: number;
};

type PanDrag = {
  pointerId: number;
  start: CanvasPoint;
  origin: CanvasPoint;
};

type NodeDrag = {
  id: string;
  pointerId: number;
  start: CanvasPoint;
  origin: CanvasPoint;
  moved: boolean;
};

const BOARD_WIDTH = 1280;
const BOARD_HEIGHT = 820;
const FEATURE_WIDTH = 250;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function defaultFeaturePosition(index: number): CanvasPoint {
  return {
    x: 120 + (index % 3) * 300,
    y: 150 + Math.floor(index / 3) * 185,
  };
}

function defaultDriftPosition(index: number): CanvasPoint {
  return {
    x: 120 + index * 300,
    y: 520,
  };
}

function buildDefaultPositions(graph: GraphState) {
  const positions: Record<string, CanvasPoint> = {};
  const features = graph.features.filter((feature) => feature.status !== "drift");
  const driftNodes = graph.features.filter((feature) => feature.status === "drift");

  features.forEach((feature, index) => {
    positions[feature.id] = defaultFeaturePosition(index);
  });
  driftNodes.forEach((feature, index) => {
    positions[feature.id] = defaultDriftPosition(index);
  });

  return positions;
}

function artifactKindLabel(artifact: ArtifactRef) {
  switch (artifact.kind) {
    case "api":
      return "Product endpoint";
    case "service":
      return "Feature logic";
    case "test":
      return "Quality check";
    case "ui":
      return "Customer screen";
    default:
      return "Supporting work";
  }
}

function CanvasEdge({
  from,
  to,
  tone = "stroke-zinc-300",
}: {
  from: CanvasPoint;
  to: CanvasPoint;
  tone?: string;
}) {
  const startX = from.x + FEATURE_WIDTH;
  const startY = from.y + 48;
  const endX = to.x;
  const endY = to.y + 48;
  const midX =
    endX >= startX ? startX + Math.max(80, (endX - startX) / 2) : (startX + endX) / 2;
  const d = `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`;

  return (
    <path
      d={d}
      className={`${tone} fill-none`}
      strokeWidth="2"
      strokeLinecap="round"
    />
  );
}

function CanvasNode({
  id,
  position,
  children,
  onDragStart,
}: {
  id: string;
  position: CanvasPoint;
  children: ReactNode;
  onDragStart: (id: string, event: PointerEvent<HTMLDivElement>) => void;
}) {
  return (
    <div
      className="absolute w-[250px] touch-none"
      style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
      onPointerDown={(event) => onDragStart(id, event)}
    >
      {children}
    </div>
  );
}

function ArtifactStack({
  feature,
  artifacts,
  position,
}: {
  feature?: FeatureNodeType;
  artifacts: ArtifactRef[];
  position: CanvasPoint;
}) {
  return (
    <div
      className="absolute w-[300px] rounded-lg border border-zinc-200 bg-white/95 p-3 shadow-sm"
      style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-zinc-900">Feature evidence</h3>
          <p className="text-xs text-zinc-500">
            {feature ? feature.name : "Selected feature"}
          </p>
        </div>
        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500">
          {artifacts.length}
        </span>
      </div>
      {artifacts.length > 0 ? (
        <div className="grid gap-2">
          {artifacts.slice(0, 4).map((artifact) => (
            <div key={artifact.id}>
              <div className="mb-1 text-[11px] font-medium text-zinc-500">
                {artifactKindLabel(artifact)}
              </div>
              <ArtifactNode
                artifact={artifact}
                active={feature?.status !== "not_started"}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-4 text-sm text-zinc-500">
          Evidence will attach here when this feature maps to implementation work.
        </div>
      )}
    </div>
  );
}

export function FeatureCanvas({
  graph,
  selectedNodeId,
  onSelectNode,
  chatPanel,
}: FeatureCanvasProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const suppressClickNode = useRef<string | undefined>(undefined);
  const [viewport, setViewport] = useState<Viewport>({ x: 48, y: 92, zoom: 0.76 });
  const [panDrag, setPanDrag] = useState<PanDrag>();
  const [nodeDrag, setNodeDrag] = useState<NodeDrag>();
  const [customPositions, setCustomPositions] = useState<Record<string, CanvasPoint>>({});

  const scopedFeatures = graph.features.filter((feature) => feature.status !== "drift");
  const driftNodes = graph.features.filter((feature) => feature.status === "drift");
  const selectedFeature =
    graph.features.find((feature) => feature.id === selectedNodeId) ??
    scopedFeatures[0];
  const defaultPositions = useMemo(() => buildDefaultPositions(graph), [graph]);
  const positions = { ...defaultPositions, ...customPositions };
  const selectedPosition = selectedFeature
    ? positions[selectedFeature.id] ?? defaultFeaturePosition(0)
    : undefined;
  const artifactPosition: CanvasPoint = {
    x: clamp((selectedPosition?.x ?? 180) - 40, 120, BOARD_WIDTH - 340),
    y: Math.max(120, (selectedPosition?.y ?? 150) + 145),
  };
  function resetView() {
    setViewport({ x: 48, y: 92, zoom: 0.76 });
    setCustomPositions({});
  }

  function zoomTo(nextZoom: number) {
    setViewport((current) => ({
      ...current,
      zoom: clamp(nextZoom, 0.45, 1.65),
    }));
  }

  function handleWheel(event: WheelEvent<HTMLDivElement>) {
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const nextZoom = clamp(
      viewport.zoom * (event.deltaY > 0 ? 0.92 : 1.08),
      0.45,
      1.65,
    );
    const cursor = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
    const world = {
      x: (cursor.x - viewport.x) / viewport.zoom,
      y: (cursor.y - viewport.y) / viewport.zoom,
    };

    setViewport({
      x: cursor.x - world.x * nextZoom,
      y: cursor.y - world.y * nextZoom,
      zoom: nextZoom,
    });
  }

  function handlePanStart(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    setPanDrag({
      pointerId: event.pointerId,
      start: { x: event.clientX, y: event.clientY },
      origin: { x: viewport.x, y: viewport.y },
    });
  }

  function handleNodeDragStart(id: string, event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) {
      return;
    }

    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    setNodeDrag({
      id,
      pointerId: event.pointerId,
      start: { x: event.clientX, y: event.clientY },
      origin: positions[id] ?? { x: 0, y: 0 },
      moved: false,
    });
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (panDrag?.pointerId === event.pointerId) {
      setViewport({
        ...viewport,
        x: panDrag.origin.x + event.clientX - panDrag.start.x,
        y: panDrag.origin.y + event.clientY - panDrag.start.y,
      });
      return;
    }

    if (nodeDrag?.pointerId === event.pointerId) {
      const delta = {
        x: (event.clientX - nodeDrag.start.x) / viewport.zoom,
        y: (event.clientY - nodeDrag.start.y) / viewport.zoom,
      };
      const moved = nodeDrag.moved || Math.abs(delta.x) + Math.abs(delta.y) > 5;

      setCustomPositions((current) => ({
        ...current,
        [nodeDrag.id]: {
          x: clamp(nodeDrag.origin.x + delta.x, 40, BOARD_WIDTH - FEATURE_WIDTH - 40),
          y: clamp(nodeDrag.origin.y + delta.y, 40, BOARD_HEIGHT - 130),
        },
      }));
      setNodeDrag({ ...nodeDrag, moved });
    }
  }

  function handlePointerEnd(event: PointerEvent<HTMLDivElement>) {
    if (panDrag?.pointerId === event.pointerId) {
      setPanDrag(undefined);
    }

    if (nodeDrag?.pointerId === event.pointerId) {
      if (nodeDrag.moved) {
        suppressClickNode.current = nodeDrag.id;
      }
      setNodeDrag(undefined);
    }
  }

  function selectFeature(featureId: string) {
    if (suppressClickNode.current === featureId) {
      suppressClickNode.current = undefined;
      return;
    }

    onSelectNode(featureId);
  }

  return (
    <section className="relative min-h-[640px] overflow-hidden rounded-xl border border-zinc-200 bg-[#f8f8f6] shadow-sm lg:min-h-[calc(100vh-124px)]">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(#e4e5df_1px,transparent_1px),linear-gradient(90deg,#e4e5df_1px,transparent_1px)] bg-[size:32px_32px]" />

      <div className="absolute left-4 top-4 z-20 flex max-w-[calc(100%-2rem)] flex-wrap items-center gap-2">
        <div className="rounded-lg border border-zinc-200 bg-white/95 px-3 py-2 shadow-sm">
          <h2 className="text-sm font-semibold text-zinc-900">Feature map</h2>
          <p className="text-xs text-zinc-500">
            {selectedFeature
              ? `${selectedFeature.name} is ${selectedFeature.status.replace("_", " ")}`
              : "Create or select a feature node"}
          </p>
        </div>
        <GraphLegend />
      </div>

      <div className="absolute right-4 top-4 z-20 flex items-center gap-1 rounded-lg border border-zinc-200 bg-white/95 p-1 shadow-sm">
        <button
          type="button"
          title="Zoom out"
          onClick={() => zoomTo(viewport.zoom - 0.12)}
          className="grid h-8 w-8 place-items-center rounded-md text-sm font-semibold text-zinc-700 hover:bg-zinc-100"
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
          className="grid h-8 w-8 place-items-center rounded-md text-sm font-semibold text-zinc-700 hover:bg-zinc-100"
        >
          +
        </button>
        <button
          type="button"
          title="Reset canvas"
          onClick={resetView}
          className="h-8 rounded-md px-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
        >
          Fit
        </button>
      </div>

      {chatPanel ? (
        <div
          className="absolute bottom-5 left-5 right-5 z-20 flex justify-center"
          onPointerDown={(event) => event.stopPropagation()}
        >
          {chatPanel}
        </div>
      ) : null}

      {scopedFeatures.length === 0 ? (
        <div className="relative z-10 h-full min-h-[640px] p-4 pt-28">
          <div className="max-w-[280px] rounded-lg border border-dashed border-zinc-300 bg-white/90 px-3 py-2 text-left shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-zinc-500">
              Empty canvas
            </p>
            <p className="mt-1 text-sm font-medium text-zinc-900">
              No feature nodes yet.
            </p>
            <p className="mt-1 text-xs leading-5 text-zinc-500">
              Feature nodes will appear here from the live canvas backend.
            </p>
          </div>
        </div>
      ) : (
        <div
          ref={viewportRef}
          className={`relative z-10 h-full min-h-[640px] touch-none overflow-hidden ${
            panDrag ? "cursor-grabbing" : "cursor-grab"
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
              {selectedPosition ? (
                <CanvasEdge
                  from={selectedPosition}
                  to={artifactPosition}
                  tone="stroke-zinc-400"
                />
              ) : null}
            </svg>

            {scopedFeatures.map((feature) => (
              <CanvasNode
                key={feature.id}
                id={feature.id}
                position={positions[feature.id] ?? defaultFeaturePosition(0)}
                onDragStart={handleNodeDragStart}
              >
                <FeatureNode
                  id={feature.id}
                  name={feature.name}
                  status={feature.status}
                  selected={selectedNodeId === feature.id}
                  onSelect={() => selectFeature(feature.id)}
                />
              </CanvasNode>
            ))}

            {driftNodes.map((feature, index) => (
              <CanvasNode
                key={feature.id}
                id={feature.id}
                position={positions[feature.id] ?? defaultDriftPosition(index)}
                onDragStart={handleNodeDragStart}
              >
                <FeatureNode
                  id={feature.id}
                  name={feature.name}
                  status={feature.status}
                  selected={selectedNodeId === feature.id}
                  onSelect={() => selectFeature(feature.id)}
                />
              </CanvasNode>
            ))}

            <ArtifactStack
              feature={selectedFeature}
              artifacts={selectedFeature?.artifacts ?? []}
              position={artifactPosition}
            />
          </div>
        </div>
      )}
    </section>
  );
}
