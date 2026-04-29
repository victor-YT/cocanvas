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
      <label className="mb-1 block text-xs font-medium text-zinc-500">
        Codex task
      </label>
      <div className="flex gap-2">
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="min-w-0 flex-1 bg-transparent text-sm outline-none"
        />
        <button
          type="button"
          disabled={isReplaying}
          onClick={onRunDemo}
          className="shrink-0 rounded-lg bg-zinc-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
        >
          {isReplaying ? "Replaying" : "Run Demo Replay"}
        </button>
      </div>
    </div>
  );
}
