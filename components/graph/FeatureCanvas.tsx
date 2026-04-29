import type { GraphState } from "@/lib/types/graph";
import { ArtifactNode } from "./ArtifactNode";
import { FeatureNode } from "./FeatureNode";
import { GraphLegend } from "./GraphLegend";

type FeatureCanvasProps = {
  graph: GraphState;
  selectedNodeId?: string;
  onSelectNode: (id: string) => void;
};

export function FeatureCanvas({
  graph,
  selectedNodeId,
  onSelectNode,
}: FeatureCanvasProps) {
  const scopedFeatures = graph.features.filter((feature) => feature.status !== "drift");
  const driftNodes = graph.features.filter((feature) => feature.status === "drift");
  const selectedFeature =
    graph.features.find((feature) => feature.id === selectedNodeId) ??
    scopedFeatures[0];

  return (
    <section className="relative min-h-[calc(100vh-112px)] overflow-hidden rounded-lg border border-zinc-200 bg-white bg-[radial-gradient(circle_at_1px_1px,#d7dbe3_1px,transparent_0)] bg-[size:24px_24px] shadow-sm">
      <div className="relative flex h-full min-h-[calc(100vh-112px)] flex-col p-4 sm:p-5">
        <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <h2 className="text-lg font-semibold">Feature Graph</h2>
            <p className="text-sm text-zinc-500">
              {selectedFeature
                ? `${selectedFeature.name} on the canvas`
                : "Run the demo to build the first feature"}
            </p>
          </div>
          <GraphLegend />
        </div>

        {scopedFeatures.length === 0 ? (
          <div className="grid flex-1 place-items-center rounded-lg border border-dashed border-zinc-300 bg-white/70 p-8 text-center">
            <div>
              <p className="text-sm font-semibold text-zinc-900">No features yet</p>
              <p className="mt-1 max-w-sm text-sm text-zinc-500">
                Start a Codex task and let the canvas grow from implementation evidence.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-1 flex-col justify-between gap-5">
            <div className="relative flex-1">
              <div className="absolute left-[8%] top-[18%] grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {scopedFeatures.map((feature) => (
                  <FeatureNode
                    key={feature.id}
                    id={feature.id}
                    name={feature.name}
                    status={feature.status}
                    source={feature.source}
                    selected={selectedNodeId === feature.id}
                    onSelect={() => onSelectNode(feature.id)}
                  />
                ))}
              </div>
              <div className="absolute left-[48%] top-[42%] grid w-[240px] gap-2">
                {selectedFeature?.artifacts.slice(0, 3).map((artifact) => (
                  <ArtifactNode
                    key={artifact.id}
                    artifact={artifact}
                    active={selectedFeature.status !== "not_started"}
                  />
                ))}
              </div>
            </div>

            {driftNodes.length > 0 ? (
              <div className="pb-4">
                <div className="mb-2 text-xs font-semibold uppercase text-zinc-500">
                  Out-of-scope drift
                </div>
                <div className="flex flex-wrap gap-3">
                  {driftNodes.map((node) => (
                    <FeatureNode
                      key={node.id}
                      id={node.id}
                      name={node.name}
                      status={node.status}
                      source={node.source}
                      selected={selectedNodeId === node.id}
                      onSelect={() => onSelectNode(node.id)}
                    />
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}

      </div>
    </section>
  );
}
