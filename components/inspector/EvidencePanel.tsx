import type { FeatureNode } from "@/lib/types/graph";

type EvidencePanelProps = {
  node?: FeatureNode;
};

function evidenceTitle(title: string) {
  return title === "PRD source" ? "Feature source" : title;
}

export function EvidencePanel({ node }: EvidencePanelProps) {
  const latestEvidence = node?.evidence.slice(-4) ?? [];

  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
      <h2 className="text-sm font-semibold">Evidence</h2>
      {!node ? (
        <p className="mt-2 text-sm text-zinc-500">Select a node.</p>
      ) : (
        <div className="mt-2 space-y-2">
          <p className="text-sm font-medium">{node.name}</p>
          {latestEvidence.length === 0 ? (
            <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-3 text-xs text-zinc-500">
              Evidence will appear here as Codex plans, edits, and tests this feature.
            </div>
          ) : (
            latestEvidence.map((item) => (
              <div key={item.id} className="rounded-lg bg-white p-2 text-xs shadow-sm">
                <p className="font-medium text-zinc-800">{evidenceTitle(item.title)}</p>
                <p className="mt-1 text-zinc-500">{item.detail}</p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
