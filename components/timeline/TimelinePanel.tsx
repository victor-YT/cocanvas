import type { CodexTimelineEvent } from "@/lib/types/codex";
import { TimelineItem } from "./TimelineItem";

type TimelinePanelProps = {
  events: CodexTimelineEvent[];
  isReplaying: boolean;
};

export function TimelinePanel({ events, isReplaying }: TimelinePanelProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-zinc-200 px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">Codex Timeline</h2>
            <p className="text-xs text-zinc-500">{events.length} events</p>
          </div>
          {isReplaying ? (
            <span className="rounded-full bg-zinc-950 px-2.5 py-1 text-[11px] font-medium text-white">
              Live
            </span>
          ) : null}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-3">
        {events.length === 0 ? (
          <div className="grid min-h-[220px] place-items-center rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-6 text-center">
            <div>
              <p className="text-sm font-medium text-zinc-800">No replay events yet</p>
              <p className="mt-1 text-xs text-zinc-500">
                Run the demo to watch plan, code, test, and drift signals arrive here.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {events.map((event) => (
              <TimelineItem key={event.id} event={event} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
