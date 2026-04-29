const items = [
  ["bg-zinc-300", "Not started"],
  ["bg-amber-400", "Changed"],
  ["bg-emerald-400", "Verified"],
  ["bg-rose-400", "Risk"],
  ["bg-violet-400", "Drift"],
];

export function GraphLegend() {
  return (
    <div className="hidden items-center gap-3 rounded-lg border border-zinc-200 bg-white/80 px-3 py-2 text-xs text-zinc-600 shadow-sm md:flex">
      {items.map(([color, label]) => (
        <div key={label} className="flex items-center gap-1.5">
          <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
          <span>{label}</span>
        </div>
      ))}
    </div>
  );
}
