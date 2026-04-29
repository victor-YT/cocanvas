import type { FeatureStatus, FeatureNode as FeatureNodeType } from "@/lib/types/graph";

const statusClass: Record<FeatureStatus, { card: string; dot: string; label: string }> = {
  not_started: {
    card: "border-zinc-200 bg-white text-zinc-700",
    dot: "bg-zinc-300",
    label: "Not started",
  },
  in_progress: {
    card: "border-amber-300 bg-amber-50 text-amber-950 shadow-amber-200/50",
    dot: "bg-amber-400",
    label: "Changed",
  },
  verified: {
    card: "border-emerald-300 bg-emerald-50 text-emerald-950 shadow-emerald-200/50",
    dot: "bg-emerald-400",
    label: "Verified",
  },
  risk: {
    card: "border-rose-300 bg-rose-50 text-rose-950 shadow-rose-200/50",
    dot: "bg-rose-400",
    label: "Risk",
  },
  drift: {
    card: "border-violet-300 bg-violet-50 text-violet-950 shadow-violet-200/50",
    dot: "bg-violet-400",
    label: "Drift",
  },
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
  const tone = statusClass[status];

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`w-full max-w-[220px] rounded-lg border px-4 py-3 text-left shadow-lg transition duration-200 hover:-translate-y-0.5 hover:shadow-xl ${tone.card} ${
        selected ? "ring-2 ring-zinc-900/70 ring-offset-2" : ""
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-sm font-semibold">{name}</span>
        <span className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-medium uppercase">
          {source}
        </span>
      </div>
      <p className="mt-2 flex items-center gap-1.5 text-xs font-medium opacity-80">
        <span className={`h-2 w-2 rounded-full ${tone.dot}`} />
        {tone.label}
      </p>
    </button>
  );
}
