type CodexTaskPanelProps = {
  value: string;
  isReplaying: boolean;
  onChange: (value: string) => void;
  onRunDemo: () => void;
};

export function CodexTaskPanel({
  value,
  isReplaying,
  onChange,
  onRunDemo,
}: CodexTaskPanelProps) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-2">
      <div className="mb-1 flex items-center justify-between gap-2">
        <label className="block text-xs font-medium text-zinc-500">
          Codex task
        </label>
        {isReplaying ? (
          <span className="text-xs font-medium text-amber-700">Replaying</span>
        ) : null}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="min-h-10 min-w-0 flex-1 rounded-md bg-white px-3 text-sm outline-none ring-1 ring-zinc-200 transition focus:ring-zinc-400"
        />
        <button
          type="button"
          disabled={isReplaying}
          onClick={onRunDemo}
          className="min-h-10 shrink-0 rounded-lg bg-zinc-950 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400 sm:min-w-[154px]"
        >
          {isReplaying ? "Running..." : "Run Demo Replay"}
        </button>
      </div>
    </div>
  );
}
