import type { GraphTimelineItem } from "@/lib/types/observedGraph";

const eventTone: Record<GraphTimelineItem["type"], string> = {
  "node.upsert": "bg-zinc-100 text-zinc-700 border-zinc-200",
  "edge.upsert": "bg-blue-50 text-blue-800 border-blue-100",
  "status.update": "bg-amber-50 text-amber-800 border-amber-100",
  "evidence.add": "bg-emerald-50 text-emerald-800 border-emerald-100",
  "risk.add": "bg-rose-50 text-rose-800 border-rose-100",
};

type TimelineItemProps = {
  event: GraphTimelineItem;
};

export function TimelineItem({ event }: TimelineItemProps) {
  return (
    <article className="rounded-lg border border-zinc-200 bg-white p-3 shadow-sm transition hover:border-zinc-300">
      <div className="flex items-start justify-between gap-3">
        <h3 className="min-w-0 text-sm font-medium leading-5">{event.title}</h3>
        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium ${eventTone[event.type]}`}>
          {event.type}
        </span>
      </div>
      {event.detail ? (
        <p className="mt-2 text-xs leading-5 text-zinc-500">{event.detail}</p>
      ) : null}
    </article>
  );
}
