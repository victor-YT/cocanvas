import type { CodexTimelineEvent } from "@/lib/types/codex";
import { TimelinePanel } from "@/components/timeline/TimelinePanel";

type RightTimelineProps = {
  events: CodexTimelineEvent[];
};

export function RightTimeline({ events }: RightTimelineProps) {
  return (
    <aside className="min-h-[360px] rounded-lg border border-zinc-200 bg-white shadow-sm">
      <TimelinePanel events={events} />
    </aside>
  );
}
