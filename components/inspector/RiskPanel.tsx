import type { FeatureNode } from "@/lib/types/graph";

type RiskPanelProps = {
  node?: FeatureNode;
};

export function RiskPanel({ node }: RiskPanelProps) {
  const criteria = node?.acceptanceCriteria.slice(0, 4) ?? [];

  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
      <h2 className="text-sm font-semibold">Risk</h2>
      {!node ? (
        <p className="mt-2 text-sm text-zinc-500">No node selected.</p>
      ) : (
        <div className="mt-2">
          <p className="text-sm text-zinc-600">
            {node.riskSummary ?? "No active risk summary."}
          </p>
          <div className="mt-3 grid gap-2">
            {criteria.length === 0 ? (
              <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-3 text-xs text-zinc-500">
                Acceptance criteria will populate from the PRD parser.
              </div>
            ) : (
              criteria.map((criterion) => (
                <div
                  key={criterion.id}
                  className="flex items-start justify-between gap-3 rounded-lg bg-white p-2 text-xs shadow-sm"
                >
                  <span className="text-zinc-700">{criterion.text}</span>
                  <span className="shrink-0 capitalize text-zinc-500">
                    {criterion.status.replace("_", " ")}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
