import type { FeatureStatus, FeatureNode as FeatureNodeType } from "@/lib/types/graph";

const statusClass: Record<FeatureStatus, string> = {
  not_started: "border-zinc-200 bg-white text-zinc-700",
  in_progress: "border-amber-300 bg-amber-50 text-amber-950 shadow-amber-200/40",
  verified: "border-emerald-300 bg-emerald-50 text-emerald-950 shadow-emerald-200/40",
  risk: "border-rose-300 bg-rose-50 text-rose-950 shadow-rose-200/40",
  drift: "border-violet-300 bg-violet-50 text-violet-950 shadow-violet-200/40",
};

type FeatureNodeProps = {
  id: string;
  name: string;
  source: FeatureNodeType["source"];
  status: FeatureStatus;
  selected: boolean;
  onSelect: () => void;
};

export function FeatureNode({
  name,
  source,
  status,
  selected,
  onSelect,
}: FeatureNodeProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-[190px] rounded-lg border px-4 py-3 text-left shadow-lg transition duration-200 ${statusClass[status]} ${
        selected ? "ring-2 ring-zinc-900/70 ring-offset-2" : ""
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-sm font-semibold">{name}</span>
        <span className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide">
          {source}
        </span>
      </div>
      <p className="mt-2 text-xs capitalize opacity-75">
        {status.replace("_", " ")}
      </p>
    </button>
  );
}
