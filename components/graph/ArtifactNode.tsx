import type { ArtifactRef } from "@/lib/types/graph";

type ArtifactNodeProps = {
  artifact: ArtifactRef;
  active: boolean;
};

export function ArtifactNode({ artifact, active }: ArtifactNodeProps) {
  return (
    <div
      className={`rounded-lg border bg-white px-3 py-2 shadow-sm transition ${
        active ? "border-amber-300 shadow-amber-100" : "border-zinc-200"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase text-zinc-500">
          {artifact.kind}
        </span>
        <span className="text-xs text-zinc-400">
          {Math.round(artifact.confidence * 100)}%
        </span>
      </div>
      <p className="mt-1 truncate text-sm font-medium text-zinc-900" title={artifact.path}>
        {artifact.path}
      </p>
      {artifact.role ? (
        <p className="mt-1 text-xs text-zinc-500">{artifact.role}</p>
      ) : null}
    </div>
  );
}
