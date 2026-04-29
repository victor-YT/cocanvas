"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import {
  CODEX_MODEL_OPTIONS,
  CODEX_REASONING_EFFORT_OPTIONS,
  DEFAULT_CODEX_MODEL,
  DEFAULT_CODEX_REASONING_EFFORT,
  type CodexModel,
  type CodexReasoningEffort,
} from "@/lib/codex/options";

export type CodexRunOptions = {
  model: CodexModel;
  effort: CodexReasoningEffort;
};

type CodexChatPanelProps = {
  draft: string;
  isRunning: boolean;
  onDraftChange: (value: string) => void;
  onSubmit: (options: CodexRunOptions) => void;
};

type PickerOption<T extends string> = {
  value: T;
  label: string;
};

const defaultOptions: CodexRunOptions = {
  model: DEFAULT_CODEX_MODEL,
  effort: DEFAULT_CODEX_REASONING_EFFORT,
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

function ChevronIcon() {
  return (
    <Icon className="h-3.5 w-3.5">
      <path d="m6 9 6 6 6-6" />
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

function UpwardPicker<T extends string>({
  ariaLabel,
  disabled,
  icon,
  options,
  value,
  onChange,
}: {
  ariaLabel: string;
  disabled: boolean;
  icon?: ReactNode;
  options: readonly PickerOption<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative inline-flex">
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50 px-2.5 text-xs font-bold text-zinc-700 transition hover:bg-zinc-100 focus-visible:ring-2 focus-visible:ring-zinc-200 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {icon}
        <span className="whitespace-nowrap">{selected.label}</span>
        <span className="rotate-180 text-zinc-400">
          <ChevronIcon />
        </span>
      </button>

      {open ? (
        <div className="absolute bottom-full right-0 z-50 mb-2 w-max min-w-full rounded-2xl border border-zinc-200 bg-white p-1.5 shadow-[0_14px_36px_rgba(24,24,27,0.14)]">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              className={`flex h-8 w-full cursor-pointer items-center justify-start rounded-xl px-3 text-left text-xs font-bold transition ${
                option.value === value
                  ? "bg-zinc-950 text-white"
                  : "text-zinc-700 hover:bg-zinc-100"
              }`}
            >
              <span className="whitespace-nowrap">{option.label}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function CodexChatPanel({
  draft,
  isRunning,
  onDraftChange,
  onSubmit,
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

        <div className="mt-2 flex flex-wrap items-center justify-end gap-2">
          {/* Quick actions are hidden until they map to first-class run modes. */}
          <div className="flex shrink-0 items-center gap-2">
            <UpwardPicker
              ariaLabel="Reasoning effort"
              disabled={isRunning}
              icon={<BoltIcon />}
              options={CODEX_REASONING_EFFORT_OPTIONS}
              value={options.effort}
              onChange={(effort) => {
                setOptions((current) => ({
                  ...current,
                  effort,
                }));
              }}
            />

            <UpwardPicker
              ariaLabel="Codex model"
              disabled={isRunning}
              options={CODEX_MODEL_OPTIONS}
              value={options.model}
              onChange={(model) => {
                setOptions((current) => ({
                  ...current,
                  model,
                }));
              }}
            />

            <button
              type="submit"
              disabled={!canSubmit}
              className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-full bg-zinc-950 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-zinc-800 focus-visible:ring-2 focus-visible:ring-zinc-300 disabled:cursor-not-allowed disabled:bg-zinc-300"
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
