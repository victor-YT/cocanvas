type TopBarProps = {
  currentRun: string;
  isReplaying: boolean;
  notice?: string;
  onCurrentRunChange: (value: string) => void;
  onRunDemo: () => void;
  onRunCodexTask: () => void;
  onResetCanvas: () => void;
};

export function TopBar({
  currentRun,
  isReplaying,
  notice,
  onCurrentRunChange,
  onRunDemo,
  onRunCodexTask,
  onResetCanvas,
}: TopBarProps) {
  return (
    <header className="border-b border-zinc-200 bg-white/92 px-3 py-2 shadow-sm backdrop-blur">
      <div className="grid gap-2 lg:grid-cols-[220px_240px_1fr_auto] lg:items-center">
        <div>
          <p className="text-xs font-medium uppercase text-zinc-500">cocanvas</p>
          <h1 className="text-lg font-semibold">Observed feature graph</h1>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-2">
          <label className="mb-1 block text-xs font-medium text-zinc-500">
            Current repo
          </label>
          <div className="truncate text-sm font-medium text-zinc-900">
            /projects/cocanvas
          </div>
        </div>

        <label className="rounded-lg border border-zinc-200 bg-zinc-50 p-2">
          <span className="mb-1 block text-xs font-medium text-zinc-500">
            Current Codex Run
          </span>
          <input
            value={currentRun}
            onChange={(event) => onCurrentRunChange(event.target.value)}
            className="h-8 w-full bg-transparent text-sm font-medium outline-none"
          />
          {notice ? (
            <span className="mt-1 block truncate text-xs text-zinc-500" title={notice}>
              {notice}
            </span>
          ) : null}
        </label>

        <div className="flex flex-wrap gap-2 lg:justify-end">
          <button
            type="button"
            disabled={isReplaying}
            onClick={onRunDemo}
            className="h-10 rounded-lg bg-zinc-950 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
          >
            {isReplaying ? "Replaying..." : "Run Demo Replay"}
          </button>
          <button
            type="button"
            onClick={onRunCodexTask}
            className="h-10 rounded-lg border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-800 shadow-sm transition hover:bg-zinc-50"
          >
            Run Codex Task
          </button>
          <button
            type="button"
            onClick={onResetCanvas}
            className="h-10 rounded-lg border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-800 shadow-sm transition hover:bg-zinc-50"
          >
            Reset Canvas
          </button>
        </div>
      </div>
    </header>
  );
}
