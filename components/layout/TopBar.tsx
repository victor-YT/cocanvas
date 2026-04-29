import { CodexTaskPanel } from "@/components/codex/CodexTaskPanel";

type TopBarProps = {
  task: string;
  isReplaying: boolean;
  notice?: string;
  onTaskChange: (value: string) => void;
  onRunDemo: () => void;
  featureCount: number;
};

export function TopBar({
  task,
  isReplaying,
  notice,
  onTaskChange,
  onRunDemo,
  featureCount,
}: TopBarProps) {
  return (
    <header className="border-b border-zinc-200/80 bg-white/88 px-4 py-3 shadow-sm backdrop-blur">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
        <div className="min-w-[240px]">
          <p className="text-xs font-semibold uppercase text-zinc-500">cocanvas</p>
          <h1 className="text-xl font-semibold tracking-normal text-zinc-950">
            Feature canvas
          </h1>
        </div>
        <div className="grid flex-1 grid-cols-1 gap-3 lg:grid-cols-[minmax(220px,0.42fr)_minmax(360px,1fr)]">
          <div className="flex min-h-16 items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-zinc-900">
                /projects/cocanvas
              </div>
              <p className="mt-1 truncate text-xs text-zinc-500" title={notice}>
                {notice ?? "Canvas is ready for feature-first work."}
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700 shadow-sm">
              {featureCount} features
            </span>
          </div>
          <CodexTaskPanel
            value={task}
            isReplaying={isReplaying}
            onChange={onTaskChange}
            onRunDemo={onRunDemo}
          />
        </div>
      </div>
    </header>
  );
}
