import type { CodexTimelineEvent } from "@/lib/types/codex";
import { TimelinePanel } from "@/components/timeline/TimelinePanel";

type RightTimelineProps = {
  events: CodexTimelineEvent[];
  isReplaying: boolean;
};

export function RightTimeline({ events, isReplaying }: RightTimelineProps) {
  return (
    <aside className="min-h-[260px] overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm lg:min-h-[calc((100vh-220px)*0.42)]">
      <TimelinePanel events={events} isReplaying={isReplaying} />
    </aside>
  );
}
