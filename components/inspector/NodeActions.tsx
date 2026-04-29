import type { FeatureNode } from "@/lib/types/graph";
import type { CodexFunctionId } from "@/components/codex/CodexChatPanel";

const actions: Array<{ label: string; functionId: CodexFunctionId }> = [
  { label: "Plan", functionId: "plan" },
  { label: "Build", functionId: "implement" },
  { label: "Test", functionId: "test" },
  { label: "Review", functionId: "review" },
];

type NodeActionsProps = {
  node?: FeatureNode;
  onRunFunction: (id: CodexFunctionId) => void;
};

export function NodeActions({ node, onRunFunction }: NodeActionsProps) {
  const improvePrompt = node
    ? `Improve the ${node.name} feature. Only touch files linked to this feature unless necessary.`
    : "";

  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
      <h2 className="text-sm font-semibold">Actions</h2>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {actions.map((action) => (
          <button
            key={action.label}
            type="button"
            disabled={!node}
            onClick={() => onRunFunction(action.functionId)}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400"
          >
            {action.label}
          </button>
        ))}
      </div>
      {node ? (
        <code className="mt-3 block rounded-lg bg-white p-2 text-xs leading-5 text-zinc-600 shadow-sm">
          {improvePrompt}
        </code>
      ) : null}
    </div>
  );
}
