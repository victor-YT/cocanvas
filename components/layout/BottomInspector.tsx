import type { GraphState } from "@/lib/types/graph";
import { EvidencePanel } from "@/components/inspector/EvidencePanel";
import { NodeActions } from "@/components/inspector/NodeActions";
import { RiskPanel } from "@/components/inspector/RiskPanel";

type BottomInspectorProps = {
  graph: GraphState;
  selectedNodeId?: string;
};

export function BottomInspector({ graph, selectedNodeId }: BottomInspectorProps) {
  const selectedNode = graph.features.find((node) => node.id === selectedNodeId);

  return (
    <section className="border-t border-zinc-200 bg-white px-4 py-3 shadow-[0_-8px_30px_rgba(15,23,42,0.04)]">
      <div className="grid gap-3 lg:grid-cols-[1.1fr_1fr_0.8fr]">
        <EvidencePanel node={selectedNode} />
        <RiskPanel node={selectedNode} />
        <NodeActions node={selectedNode} />
      </div>
    </section>
  );
}
