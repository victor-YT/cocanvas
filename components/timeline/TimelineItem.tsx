import type { CodexTimelineEvent } from "@/lib/types/codex";

const eventTone: Record<string, string> = {
  plan_updated: "bg-sky-50 text-sky-800",
  file_change: "bg-amber-50 text-amber-800",
  command_started: "bg-zinc-100 text-zinc-700",
  command_completed: "bg-emerald-50 text-emerald-800",
};

type TimelineItemProps = {
  event: CodexTimelineEvent;
};

export function TimelineItem({ event }: TimelineItemProps) {
  const tone =
    event.type === "command_completed" && event.exitCode
      ? "bg-rose-50 text-rose-800"
      : eventTone[event.type] ?? "bg-zinc-100 text-zinc-700";

  return (
    <article className="rounded-lg border border-zinc-200 bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-medium">{event.title}</h3>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${tone}`}>
          {event.type.replace("_", " ")}
        </span>
      </div>
      {event.detail ? (
        <p className="mt-2 text-xs leading-5 text-zinc-500">{event.detail}</p>
      ) : null}
      {event.command ? (
        <code className="mt-2 block truncate rounded bg-zinc-100 px-2 py-1 text-xs text-zinc-700">
          {event.command}
        </code>
      ) : null}
    </article>
  );
}
