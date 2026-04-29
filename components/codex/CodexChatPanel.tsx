"use client";

import { useState, type FormEvent, type ReactNode } from "react";

export type CodexFunctionId =
  | "plan"
  | "implement"
  | "edit"
  | "test"
  | "fix"
  | "review"
  | "explain"
  | "scope";

export type CodexRunOptions = {
  model: "auto" | "gpt-5.5" | "gpt-5.4" | "gpt-5.4-mini";
  speed: "low" | "medium" | "high" | "extra-high";
  usage: "auto" | "conserve" | "max";
  access: "ask" | "workspace" | "full";
  parallel: boolean;
};

type CodexChatPanelProps = {
  draft: string;
  isRunning: boolean;
  onDraftChange: (value: string) => void;
  onSubmit: (options: CodexRunOptions) => void;
  onRunFunction: (id: CodexFunctionId, options: CodexRunOptions) => void;
};

const defaultOptions: CodexRunOptions = {
  model: "auto",
  speed: "high",
  usage: "auto",
  access: "workspace",
  parallel: true,
};

const modelLabels: Record<CodexRunOptions["model"], string> = {
  auto: "Auto",
  "gpt-5.5": "GPT-5.5",
  "gpt-5.4": "GPT-5.4",
  "gpt-5.4-mini": "GPT-5.4 Mini",
};

const speedLabels: Record<CodexRunOptions["speed"], string> = {
  low: "Careful",
  medium: "Balanced",
  high: "Fast",
  "extra-high": "Max",
};

function Icon({
  children,
  className = "h-5 w-5",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.9"
    >
      {children}
    </svg>
  );
}

function ArrowUpIcon() {
  return (
    <Icon className="h-5 w-5">
      <path d="M12 19V5" />
      <path d="m5 12 7-7 7 7" />
    </Icon>
  );
}

function BoltIcon() {
  return (
    <Icon className="h-4 w-4">
      <path d="M13 2 5 14h6l-1 8 9-13h-6l1-7Z" />
    </Icon>
  );
}

function SpinnerIcon() {
  return (
    <Icon className="h-4 w-4 animate-spin">
      <path d="M21 12a9 9 0 1 1-9-9" />
    </Icon>
  );
}

export function CodexChatPanel({
  draft,
  isRunning,
  onDraftChange,
  onSubmit,
  onRunFunction,
}: CodexChatPanelProps) {
  const [options, setOptions] = useState<CodexRunOptions>(defaultOptions);
  const canSubmit = draft.trim().length > 0 && !isRunning;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSubmit) {
      return;
    }

    onSubmit(options);
  }

  function runQuickAction(id: CodexFunctionId) {
    if (isRunning) {
      return;
    }

    onRunFunction(id, options);
  }

  return (
    <section className="pointer-events-auto w-full max-w-[640px] text-zinc-950">
      <form
        onSubmit={handleSubmit}
        className="rounded-[22px] border border-zinc-200 bg-white/96 p-2.5 shadow-[0_16px_42px_rgba(24,24,27,0.12)] backdrop-blur"
      >
        <textarea
          value={draft}
          disabled={isRunning}
          onChange={(event) => onDraftChange(event.target.value)}
          className="min-h-[58px] w-full resize-none rounded-[17px] bg-zinc-50/70 px-4 py-3 text-[15px] font-semibold leading-6 text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:bg-white focus:ring-2 focus:ring-zinc-200 disabled:cursor-not-allowed disabled:text-zinc-500"
          placeholder="Ask Codex to build or change this repo."
        />

        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            {(["plan", "test", "review"] as const).map((action) => (
              <button
                key={action}
                type="button"
                disabled={isRunning}
                onClick={() => runQuickAction(action)}
                className="cursor-pointer rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-bold capitalize text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {action}
              </button>
            ))}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <label className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50 px-2.5 text-xs font-bold text-zinc-700 transition hover:bg-zinc-100">
              <BoltIcon />
              <select
                aria-label="Run speed"
                disabled={isRunning}
                className="cursor-pointer bg-transparent text-xs font-bold outline-none disabled:cursor-not-allowed"
                value={options.speed}
                onChange={(event) => {
                  setOptions((current) => ({
                    ...current,
                    speed: event.target.value as CodexRunOptions["speed"],
                  }));
                }}
              >
                {Object.entries(speedLabels).map(([speed, label]) => (
                  <option key={speed} value={speed}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <select
              aria-label="Codex model"
              disabled={isRunning}
              className="h-9 cursor-pointer rounded-full border border-zinc-200 bg-zinc-50 px-2.5 text-xs font-bold text-zinc-700 outline-none transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
              value={options.model}
              onChange={(event) => {
                setOptions((current) => ({
                  ...current,
                  model: event.target.value as CodexRunOptions["model"],
                }));
              }}
            >
              {Object.entries(modelLabels).map(([model, label]) => (
                <option key={model} value={model}>
                  {label}
                </option>
              ))}
            </select>

            <button
              type="submit"
              disabled={!canSubmit}
              className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-full bg-zinc-950 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-300"
            >
              {isRunning ? <SpinnerIcon /> : <ArrowUpIcon />}
              {isRunning ? "Running" : "Run"}
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}
