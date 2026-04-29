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
  const passwordReset = graph.features.find(
    (feature) => feature.id === "feature-password-reset",
  );
  const auth = graph.features.find((feature) => feature.id === "feature-auth");
  const driftNodes = graph.features.filter((feature) => feature.status === "drift");

  return (
    <section className="relative min-h-[520px] overflow-hidden rounded-lg border border-zinc-200 bg-[radial-gradient(circle_at_1px_1px,#d4d4d8_1px,transparent_0)] bg-[size:28px_28px] shadow-sm">
      <div className="absolute inset-0 bg-white/70" />
      <div className="relative flex h-full min-h-[520px] flex-col p-5">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Feature Graph</h2>
            <p className="text-sm text-zinc-500">PRD-aware status map</p>
          </div>
          <GraphLegend />
        </div>

        <div className="relative flex-1">
          <div className="absolute left-4 top-20 h-px w-[68%] bg-zinc-300" />
          <div className="absolute left-[38%] top-[178px] h-px w-[24%] bg-zinc-300" />
          <div className="absolute left-[38%] top-[258px] h-px w-[24%] bg-zinc-300" />
          <div className="absolute left-[38%] top-[338px] h-px w-[24%] bg-zinc-300" />

          <div className="absolute left-0 top-8">
            <FeatureNode
              id="prd-root"
              name="PRD"
              status="verified"
              source="prd"
              selected={selectedNodeId === "prd-root"}
              onSelect={() => undefined}
            />
          </div>
          {auth ? (
            <div className="absolute left-[24%] top-8">
              <FeatureNode
                id={auth.id}
                name={auth.name}
                status={auth.status}
                source={auth.source}
                selected={selectedNodeId === auth.id}
                onSelect={() => onSelectNode(auth.id)}
              />
            </div>
          ) : null}
          {passwordReset ? (
            <div className="absolute left-[50%] top-8">
              <FeatureNode
                id={passwordReset.id}
                name={passwordReset.name}
                status={passwordReset.status}
                source={passwordReset.source}
                selected={selectedNodeId === passwordReset.id}
                onSelect={() => onSelectNode(passwordReset.id)}
              />
            </div>
          ) : null}

          <div className="absolute left-[68%] top-[128px] grid w-[220px] gap-3">
            {passwordReset?.artifacts.map((artifact) => (
              <ArtifactNode
                key={artifact.id}
                artifact={artifact}
                active={passwordReset.status !== "not_started"}
              />
            ))}
          </div>

          <div className="absolute bottom-4 left-4 flex flex-wrap gap-3">
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
      </div>
    </section>
  );
}
