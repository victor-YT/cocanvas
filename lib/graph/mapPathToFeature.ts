import type { GraphState } from "@/lib/types/graph";

export function mapPathToFeature(path: string, graph: GraphState) {
  return graph.features.find((feature) =>
    feature.artifacts.some((artifact) => artifact.path === path),
  );
}
