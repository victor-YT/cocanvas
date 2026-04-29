import type { FeatureStatus } from "@/lib/types/graph";

const statusClass: Record<FeatureStatus, { card: string; dot: string; label: string }> = {
  not_started: {
    card: "border-zinc-200 bg-white text-zinc-700",
    dot: "bg-zinc-300",
    label: "Not started",
  },
  in_progress: {
    card: "border-amber-300 bg-white text-zinc-900 shadow-amber-200/40",
    dot: "bg-amber-400",
    label: "Changed",
  },
  verified: {
    card: "border-emerald-300 bg-white text-zinc-900 shadow-emerald-200/40",
    dot: "bg-emerald-400",
    label: "Verified",
  },
  risk: {
    card: "border-rose-300 bg-white text-zinc-900 shadow-rose-200/40",
    dot: "bg-rose-400",
    label: "Risk",
  },
  drift: {
    card: "border-violet-300 bg-white text-zinc-900 shadow-violet-200/40",
    dot: "bg-violet-400",
    label: "Drift",
  },
};

type FeatureNodeProps = {
  id: string;
  name: string;
  status: FeatureStatus;
  selected: boolean;
  onSelect: () => void;
};

export function FeatureNode({
  name,
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
      className={`w-full rounded-xl border px-4 py-3 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-lg ${tone.card} ${
        selected ? "ring-2 ring-zinc-900/80 ring-offset-2" : ""
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-[15px] font-semibold">{name}</span>
        <span className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-medium uppercase">
          Feature
        </span>
      </div>
      <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-zinc-500">
        <span className={`h-2 w-2 rounded-full ${tone.dot}`} />
        {tone.label}
      </p>
    </button>
  );
}
