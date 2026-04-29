import type { GraphState } from "@/lib/types/graph";
import { EvidencePanel } from "@/components/inspector/EvidencePanel";
import { NodeActions } from "@/components/inspector/NodeActions";
import { RiskPanel } from "@/components/inspector/RiskPanel";
import type { CodexFunctionId } from "@/components/codex/CodexChatPanel";

type BottomInspectorProps = {
  graph: GraphState;
  selectedNodeId?: string;
  onRunCodexFunction: (id: CodexFunctionId) => void;
};

export function BottomInspector({
  graph,
  selectedNodeId,
  onRunCodexFunction,
}: BottomInspectorProps) {
  const selectedNode = graph.features.find((node) => node.id === selectedNodeId);

  return (
    <section className="border-t border-zinc-200 bg-white px-4 py-2 shadow-[0_-8px_30px_rgba(15,23,42,0.04)]">
      <div className="mx-auto grid max-w-[1600px] gap-2 lg:grid-cols-[1.1fr_1fr_0.8fr]">
        <EvidencePanel node={selectedNode} />
        <RiskPanel node={selectedNode} />
        <NodeActions node={selectedNode} onRunFunction={onRunCodexFunction} />
      </div>
    </section>
  );
}
