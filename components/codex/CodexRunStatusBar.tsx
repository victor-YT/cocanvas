"use client";

export type CodexRunStatus = "idle" | "working" | "testing" | "completed" | "failed";

type CodexRunStatusBarProps = {
  status: CodexRunStatus;
  phase?: string;
  message?: string;
  elapsed?: string;
  filesChanged?: number;
  additions?: number;
  deletions?: number;
  onReviewChanges?: () => void;
  onStop?: () => void;
};

const statusTitle: Record<CodexRunStatus, string> = {
  idle: "Codex ready",
  working: "Codex is working",
  testing: "Codex is testing",
  completed: "Codex completed",
  failed: "Needs attention",
};

const statusTone: Record<CodexRunStatus, string> = {
  idle: "bg-zinc-100 text-zinc-600",
  working: "bg-emerald-50 text-emerald-700",
  testing: "bg-blue-50 text-blue-700",
  completed: "bg-emerald-100 text-emerald-700",
  failed: "bg-amber-50 text-amber-700",
};

function CheckIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
    >
      <path d="m5 12 4 4L19 6" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-3.5 w-3.5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
    >
      <path d="M8 8h8v8H8z" />
    </svg>
  );
}

function changeSummary(filesChanged?: number, additions?: number, deletions?: number) {
  const parts = [];

  if (typeof filesChanged === "number") {
    parts.push(`${filesChanged} files changed`);
  }

  if (typeof additions === "number" || typeof deletions === "number") {
    parts.push(`+${additions ?? 0} -${deletions ?? 0}`);
  }

  return parts.join(" - ");
}

export function CodexRunStatusBar({
  status,
  phase,
  message,
  elapsed,
  filesChanged,
  additions,
  deletions,
  onReviewChanges,
  onStop,
}: CodexRunStatusBarProps) {
  const active = status === "working" || status === "testing";
  const completed = status === "completed";
  const summary = changeSummary(filesChanged, additions, deletions);

  return (
    <section
      aria-live="polite"
      className={`cocanvas-run-status pointer-events-auto relative flex min-h-12 w-full max-w-[640px] items-center justify-between gap-3 overflow-hidden rounded-full border border-black/10 bg-white/86 px-3.5 py-1.5 text-zinc-950 shadow-[0_10px_34px_rgba(24,24,27,0.09)] backdrop-blur-xl transition-[box-shadow,background-color] duration-300 ${
        active ? "cocanvas-run-status-active" : ""
      }`}
    >
      <div className="relative z-10 flex min-w-0 items-center gap-3">
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${statusTone[status]}`}
        >
          {active ? (
            <span className="cocanvas-working-dot h-3 w-3 rounded-full bg-emerald-400" />
          ) : completed ? (
            <CheckIcon />
          ) : (
            <span className="h-2.5 w-2.5 rounded-full bg-zinc-400" />
          )}
        </span>

        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2 text-[13px] font-bold">
            <span className="shrink-0">{statusTitle[status]}</span>
            {elapsed && active ? (
              <span className="shrink-0 text-xs font-bold text-zinc-400">
                {elapsed}
              </span>
            ) : null}
          </div>
          <div className="truncate text-[11px] font-bold text-zinc-500">
            {phase ? `${phase} - ` : ""}
            {message || summary || "Waiting for a task."}
          </div>
        </div>
      </div>

      <div className="relative z-10 flex shrink-0 items-center gap-2">
        {summary && !active ? (
          <span className="hidden rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-bold text-zinc-600 sm:inline-flex">
            {summary}
          </span>
        ) : null}
        {completed && onReviewChanges ? (
          <button
            type="button"
            onClick={onReviewChanges}
            className="cursor-pointer rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-bold text-zinc-700 transition hover:bg-zinc-50"
          >
            Review changes
          </button>
        ) : null}
        {active && onStop ? (
          <button
            type="button"
            onClick={onStop}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-bold text-zinc-700 transition hover:bg-zinc-50"
          >
            <StopIcon />
            Stop
          </button>
        ) : null}
      </div>
    </section>
  );
}
