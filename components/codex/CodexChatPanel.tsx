"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import type { ObservedGraphNode } from "@/lib/types/observedGraph";

export type CodexChatMessage = {
  id: string;
  role: "user" | "codex";
  text: string;
};

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
  selectedNode?: ObservedGraphNode;
  messages: CodexChatMessage[];
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

function TargetIcon() {
  return (
    <Icon className="h-4 w-4">
      <path d="M12 3v3" />
      <path d="M12 18v3" />
      <path d="M3 12h3" />
      <path d="M18 12h3" />
      <circle cx="12" cy="12" r="4" />
    </Icon>
  );
}

export function CodexChatPanel({
  selectedNode,
  messages,
  draft,
  isRunning,
  onDraftChange,
  onSubmit,
  onRunFunction,
}: CodexChatPanelProps) {
  const [options, setOptions] = useState<CodexRunOptions>(defaultOptions);
  const latestMessage = messages.length > 1 ? messages.at(-1) : undefined;
  const canSubmit = draft.trim().length > 0 && !isRunning;
  const targetLabel = selectedNode?.title ?? "Selected repository";

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
        className="rounded-[24px] border border-zinc-200 bg-white/96 p-3 shadow-[0_16px_42px_rgba(24,24,27,0.12)] backdrop-blur"
      >
        <div className="mb-2 flex items-center justify-between gap-3 px-1">
          <div className="flex min-w-0 items-center gap-2 text-xs font-bold text-zinc-500">
            <TargetIcon />
            <span className="truncate">Run Codex in {targetLabel}</span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <BoltIcon />
            <select
              aria-label="Codex model"
              disabled={isRunning}
              className="cursor-pointer rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-bold text-zinc-700 outline-none transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
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
          </div>
        </div>

        <textarea
          value={draft}
          disabled={isRunning}
          onChange={(event) => onDraftChange(event.target.value)}
          className="min-h-[72px] w-full resize-none rounded-[18px] bg-zinc-50/70 px-4 py-3 text-[15px] font-semibold leading-6 text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:bg-white focus:ring-2 focus:ring-zinc-200 disabled:cursor-not-allowed disabled:text-zinc-500"
          placeholder="Tell Codex what to build, change, test, or review in this repo."
        />

        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
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

          <button
            type="submit"
            disabled={!canSubmit}
            className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-full bg-zinc-950 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-300"
          >
            {isRunning ? <SpinnerIcon /> : <ArrowUpIcon />}
            {isRunning ? "Running" : "Run Codex"}
          </button>
        </div>

        {latestMessage ? (
          <div className="mt-3 line-clamp-2 rounded-2xl bg-zinc-50 px-3 py-2 text-xs font-semibold leading-5 text-zinc-500">
            {latestMessage.text}
          </div>
        ) : null}
      </form>
    </section>
  );
}
