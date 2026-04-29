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
  const activeArtifactCount = selectedFeature?.artifacts.length ?? 0;

  return (
    <section className="relative min-h-[540px] overflow-hidden rounded-lg border border-zinc-200 bg-[radial-gradient(circle_at_1px_1px,#d4d4d8_1px,transparent_0)] bg-[size:28px_28px] shadow-sm">
      <div className="absolute inset-0 bg-white/70" />
      <div className="relative flex h-full min-h-[540px] flex-col p-4 sm:p-5">
        <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <h2 className="text-lg font-semibold">Feature Graph</h2>
            <p className="text-sm text-zinc-500">
              {selectedFeature
                ? `${selectedFeature.name} with ${activeArtifactCount} linked artifacts`
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
            <div className="grid gap-4 lg:grid-cols-[1fr_300px] lg:items-start">
              <div className="relative grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
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

              <div className="rounded-lg border border-zinc-200 bg-white/90 p-3 shadow-sm">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold">Artifacts</h3>
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500">
                    {activeArtifactCount}
                  </span>
                </div>
                {selectedFeature?.artifacts.length ? (
                  <div className="grid gap-2">
                    {selectedFeature.artifacts.map((artifact) => (
                      <ArtifactNode
                        key={artifact.id}
                        artifact={artifact}
                        active={selectedFeature.status !== "not_started"}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-3 text-sm text-zinc-500">
                    Codex file changes will attach implementation evidence here.
                  </div>
                )}
              </div>
            </div>

            {driftNodes.length > 0 ? (
              <div className="border-t border-zinc-200 pt-4">
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
