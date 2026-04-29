import type { CodexTimelineEvent } from "@/lib/types/codex";
import { TimelinePanel } from "@/components/timeline/TimelinePanel";

type RightTimelineProps = {
  events: CodexTimelineEvent[];
  isReplaying: boolean;
};

export function RightTimeline({ events, isReplaying }: RightTimelineProps) {
  return (
    <aside className="min-h-[360px] overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
      <TimelinePanel events={events} isReplaying={isReplaying} />
    </aside>
  );
}
