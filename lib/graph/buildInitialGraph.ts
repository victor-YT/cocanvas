import type { GraphState } from "@/lib/types/graph";
import type { ParsedPrd } from "@/lib/types/prd";

export function buildInitialGraph(parsedPrd: ParsedPrd): GraphState {
  return {
    selectedNodeId: parsedPrd.features[0]?.id,
    timeline: [],
    features: parsedPrd.features.map((feature) => ({
      ...feature,
      source: "prd",
      status: "not_started",
      confidence: 0.7,
      artifacts: [],
      evidence: [
        {
          id: `evidence-${feature.id}-prd`,
          type: "prd",
          title: "PRD source",
          detail: feature.description ?? feature.name,
          confidence: 0.7,
        },
      ],
    })),
    edges: [],
  };
}
