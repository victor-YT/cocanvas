import type { CodexTimelineEvent } from "@/lib/types/codex";
import { TimelineItem } from "./TimelineItem";

type TimelinePanelProps = {
  events: CodexTimelineEvent[];
};

export function TimelinePanel({ events }: TimelinePanelProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-zinc-200 px-4 py-3">
        <h2 className="text-sm font-semibold">Codex Timeline</h2>
        <p className="text-xs text-zinc-500">{events.length} events</p>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-3">
        {events.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-300 p-4 text-sm text-zinc-500">
            Run Demo Replay
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
