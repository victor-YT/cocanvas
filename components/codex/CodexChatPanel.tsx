"use client";

import { useMemo, useState, type FormEvent } from "react";
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
  isReplaying: boolean;
  onDraftChange: (value: string) => void;
  onSubmit: (options: CodexRunOptions) => void;
  onRunFunction: (id: CodexFunctionId, options: CodexRunOptions) => void;
};

type OpenMenu = "tools" | "model" | null;

const intelligenceOptions: Array<{
  value: CodexRunOptions["speed"];
  label: string;
}> = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "extra-high", label: "Extra High" },
];

const modelLabels: Record<CodexRunOptions["model"], string> = {
  auto: "Auto",
  "gpt-5.5": "GPT-5.5",
  "gpt-5.4": "GPT-5.4",
  "gpt-5.4-mini": "GPT-5.4 Mini",
};

const modelShortLabels: Record<CodexRunOptions["model"], string> = {
  auto: "Auto",
  "gpt-5.5": "5.5",
  "gpt-5.4": "5.4",
  "gpt-5.4-mini": "5.4 Mini",
};

const speedLabels: Record<CodexRunOptions["speed"], string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  "extra-high": "Extra High",
};

function Icon({
  children,
  className = "h-5 w-5",
}: {
  children: React.ReactNode;
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

function PlusIcon() {
  return (
    <Icon className="h-7 w-7">
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </Icon>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <Icon className={className ?? "h-4 w-4"}>
      <path d="m6 9 6 6 6-6" />
    </Icon>
  );
}

function ArrowUpRightIcon() {
  return (
    <Icon className="h-5 w-5">
      <path d="M7 17 17 7" />
      <path d="M8 7h9v9" />
    </Icon>
  );
}

function ShieldIcon() {
  return (
    <Icon className="h-5 w-5">
      <path d="M12 3 19 6v5c0 4.2-2.7 7.5-7 10-4.3-2.5-7-5.8-7-10V6l7-3Z" />
      <path d="M12 8v4" />
      <path d="M12 16h.01" />
    </Icon>
  );
}

function BoltIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M13 2 5 14h6l-1 8 9-13h-6l1-7Z" />
    </Icon>
  );
}

function MicIcon() {
  return (
    <Icon className="h-6 w-6">
      <path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z" />
      <path d="M19 11a7 7 0 0 1-14 0" />
      <path d="M12 18v3" />
      <path d="M8 21h8" />
    </Icon>
  );
}

function ArrowUpIcon() {
  return (
    <Icon className="h-6 w-6">
      <path d="M12 19V5" />
      <path d="m5 12 7-7 7 7" />
    </Icon>
  );
}

function StopIcon() {
  return <span className="h-3.5 w-3.5 rounded-[3px] bg-white" />;
}

function LaptopIcon() {
  return (
    <Icon className="h-5 w-5">
      <path d="M5 6h14v10H5z" />
      <path d="M3 19h18" />
    </Icon>
  );
}

function BranchIcon() {
  return (
    <Icon className="h-5 w-5">
      <path d="M6 4v12" />
      <path d="M18 8a4 4 0 0 1-4 4H6" />
      <path d="M18 4v4" />
      <path d="M6 20v.01" />
      <path d="M18 4v.01" />
    </Icon>
  );
}

function PaperclipIcon() {
  return (
    <Icon className="h-6 w-6">
      <path d="m21 8-9.5 9.5a5 5 0 0 1-7-7L13 2a3.5 3.5 0 0 1 5 5l-8.5 8.5a2 2 0 0 1-3-3L14 5" />
    </Icon>
  );
}

function SparkIcon() {
  return (
    <Icon className="h-6 w-6">
      <path d="M12 2 9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5L12 2Z" />
      <path d="M4 4l2 2" />
      <path d="m18 18 2 2" />
    </Icon>
  );
}

function ChecklistIcon() {
  return (
    <Icon className="h-6 w-6">
      <path d="m4 7 2 2 3-4" />
      <path d="M12 7h8" />
      <path d="m4 17 2 2 3-4" />
      <path d="M12 17h8" />
    </Icon>
  );
}

function DotsIcon() {
  return (
    <Icon className="h-6 w-6">
      <path d="M7 7h.01" />
      <path d="M17 7h.01" />
      <path d="M7 17h.01" />
      <path d="M17 17h.01" />
    </Icon>
  );
}

function CheckIcon() {
  return (
    <Icon className="h-5 w-5">
      <path d="m5 12 4 4 10-10" />
    </Icon>
  );
}

function SpinnerIcon() {
  return (
    <Icon className="h-6 w-6 animate-spin text-zinc-400">
      <path d="M21 12a9 9 0 1 1-9-9" />
    </Icon>
  );
}

function Toggle({
  checked,
  onClick,
}: {
  checked: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={checked}
      onClick={onClick}
      className={`flex h-8 w-14 shrink-0 items-center rounded-full p-1 transition ${
        checked ? "bg-zinc-950" : "bg-zinc-200"
      }`}
    >
      <span
        className={`h-6 w-6 rounded-full bg-white shadow-sm transition ${
          checked ? "translate-x-6" : "translate-x-0"
        }`}
      />
    </button>
  );
}

export function CodexChatPanel({
  selectedNode,
  messages,
  draft,
  isReplaying,
  onDraftChange,
  onSubmit,
  onRunFunction,
}: CodexChatPanelProps) {
  const [options, setOptions] = useState<CodexRunOptions>({
    model: "gpt-5.5",
    speed: "high",
    usage: "auto",
    access: "workspace",
    parallel: true,
  });
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);
  const [includeIdeContext, setIncludeIdeContext] = useState(false);
  const [planMode, setPlanMode] = useState(false);

  const lastUserMessage = [...messages].reverse().find((message) => message.role === "user");
  const hasConversation = messages.length > 1;
  const fileCount = Math.max(5, selectedNode?.relatedFiles.length ?? 0);
  const changedFileName = selectedNode?.relatedFiles[0]?.split("/").at(-1) ?? "route.ts";
  const focusLabel = selectedNode?.title ?? "current canvas";

  const placeholder = hasConversation
    ? "Ask for follow-up changes"
    : "Ask for follow-up changes";

  const attachmentLabel = lastUserMessage?.text.slice(0, 32) ?? "image.png";

  const optionSummary = useMemo(
    () => `${modelShortLabels[options.model]} ${speedLabels[options.speed]}`,
    [options.model, options.speed],
  );

  function updateOption<Key extends keyof CodexRunOptions>(
    key: Key,
    value: CodexRunOptions[Key],
  ) {
    setOptions((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(options);
    setOpenMenu(null);
  }

  return (
    <section className="pointer-events-auto relative w-full max-w-[720px] text-zinc-950">
      {hasConversation ? (
        <div className="mb-6 flex items-center gap-2 px-1 text-base text-zinc-500">
          <span>Editing</span>
          <span className="text-blue-500">{changedFileName}</span>
          <span className="text-green-600">+26</span>
          <span className="text-red-600">-15</span>
          <span className="text-zinc-300">›</span>
        </div>
      ) : null}

      <div className="mx-7 flex h-10 items-center justify-between rounded-t-[20px] border border-b-0 border-zinc-200 bg-white/92 px-4 text-xs shadow-sm backdrop-blur">
        <div className="min-w-0 truncate text-zinc-500">
          {fileCount} files changed{" "}
          <span className="font-medium text-green-600">+258</span>{" "}
          <span className="font-medium text-red-600">-24</span>
        </div>
        <button
          type="button"
          onClick={() => onRunFunction("review", options)}
          className="inline-flex shrink-0 items-center gap-2 text-zinc-950 transition hover:text-blue-500"
        >
          Review changes
          <ArrowUpRightIcon />
        </button>
      </div>

      <form
        onSubmit={handleSubmit}
        className="relative rounded-[24px] border border-zinc-200 bg-white/95 p-3 shadow-[0_14px_34px_rgba(24,24,27,0.08)] backdrop-blur"
      >
        {hasConversation ? (
          <button
            type="button"
            title={attachmentLabel}
            className="mb-2 inline-flex max-w-[180px] items-center gap-2 truncate rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-900 shadow-sm"
          >
            <span className="grid h-8 w-8 place-items-center rounded-full bg-zinc-50 text-zinc-400">
              <PaperclipIcon />
            </span>
            <span className="truncate">{attachmentLabel}</span>
          </button>
        ) : null}

        <textarea
          value={draft}
          onChange={(event) => onDraftChange(event.target.value)}
          className="h-12 w-full resize-none bg-transparent text-[15px] leading-6 text-zinc-900 outline-none placeholder:text-zinc-300"
          placeholder={placeholder}
        />

        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              aria-label="Open tools menu"
              aria-expanded={openMenu === "tools"}
              onClick={() => setOpenMenu(openMenu === "tools" ? null : "tools")}
              className={`grid h-9 w-9 shrink-0 place-items-center rounded-full transition ${
                openMenu === "tools"
                  ? "bg-zinc-100 text-zinc-800"
                  : "text-zinc-500 hover:bg-zinc-100"
              }`}
            >
              <PlusIcon />
            </button>

            <button
              type="button"
              onClick={() => onRunFunction("review", options)}
              className="inline-flex min-w-0 items-center gap-2 text-sm font-medium text-blue-500 transition hover:text-blue-600"
              title={`Auto-review ${focusLabel}`}
            >
              <ShieldIcon />
              <span className="truncate">Auto-review</span>
              <ChevronDownIcon />
            </button>
          </div>

          <div className="flex shrink-0 items-center gap-2.5">
            {isReplaying ? <SpinnerIcon /> : null}
            <button
              type="button"
              aria-label="Open model and intelligence menu"
              aria-expanded={openMenu === "model"}
              onClick={() => setOpenMenu(openMenu === "model" ? null : "model")}
              className="inline-flex h-9 items-center gap-2 rounded-full bg-zinc-100 px-3 text-sm text-zinc-500 transition hover:bg-zinc-200"
            >
              <BoltIcon className="h-5 w-5 text-zinc-500" />
              <span className="font-medium text-zinc-900">
                {modelShortLabels[options.model]}
              </span>
              <span>{speedLabels[options.speed]}</span>
              <ChevronDownIcon />
            </button>
            <button
              type="button"
              aria-label="Voice input"
              className="text-zinc-500 transition hover:text-zinc-900"
            >
              <MicIcon />
            </button>
            <button
              type="submit"
              aria-label={isReplaying ? "Stop task" : "Send message"}
              disabled={!isReplaying && draft.trim().length === 0}
              className="grid h-10 w-10 place-items-center rounded-full bg-zinc-950 text-white shadow-sm transition hover:bg-zinc-800 disabled:opacity-100"
            >
              {isReplaying ? <StopIcon /> : <ArrowUpIcon />}
            </button>
          </div>
        </div>

        {openMenu === "tools" ? (
          <div className="absolute bottom-[60px] left-1 w-[320px] rounded-[22px] border border-zinc-200 bg-white p-4 text-base shadow-[0_14px_38px_rgba(24,24,27,0.12)]">
            <button
              type="button"
              className="flex w-full items-center gap-4 pb-5 text-left text-zinc-950"
            >
              <PaperclipIcon />
              Add photos & files
            </button>
            <div className="border-t border-zinc-200 pt-5">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <SparkIcon />
                  Include IDE context
                </div>
                <Toggle
                  checked={includeIdeContext}
                  onClick={() => setIncludeIdeContext((current) => !current)}
                />
              </div>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <ChecklistIcon />
                  Plan mode
                </div>
                <Toggle
                  checked={planMode}
                  onClick={() => {
                    setPlanMode((current) => !current);
                    updateOption("access", planMode ? "workspace" : "ask");
                  }}
                />
              </div>
            </div>
            <button
              type="button"
              className="mt-5 flex w-full items-center justify-between border-t border-zinc-200 pt-5 text-left text-zinc-950"
            >
              <span className="flex items-center gap-4">
                <DotsIcon />
                Plugins
              </span>
              <span className="text-zinc-400">›</span>
            </button>
          </div>
        ) : null}

        {openMenu === "model" ? (
          <div className="absolute bottom-[60px] right-[-18px] w-[320px] rounded-[22px] border border-zinc-200 bg-white p-3 text-base shadow-[0_14px_38px_rgba(24,24,27,0.12)]">
            <div className="mb-3 px-3 text-zinc-500">Intelligence</div>
            <div className="grid gap-1">
              {intelligenceOptions.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => updateOption("speed", item.value)}
                  className={`flex h-11 items-center justify-between rounded-2xl px-4 text-left transition ${
                    options.speed === item.value
                      ? "bg-zinc-100 text-zinc-950"
                      : "text-zinc-950 hover:bg-zinc-50"
                  }`}
                >
                  {item.label}
                  {options.speed === item.value ? <CheckIcon /> : null}
                </button>
              ))}
            </div>
            <div className="my-3 border-t border-zinc-200" />
            {(["gpt-5.5", "gpt-5.4", "gpt-5.4-mini"] as const).map((model) => (
              <button
                key={model}
                type="button"
                onClick={() => updateOption("model", model)}
                className="flex h-11 w-full items-center justify-between rounded-2xl px-4 text-left text-zinc-950 transition hover:bg-zinc-50"
              >
                <span className="flex items-center gap-3">
                  <BoltIcon className="h-6 w-6 text-zinc-950" />
                  {modelLabels[model]}
                </span>
                {options.model === model ? <CheckIcon /> : <span className="text-zinc-400">›</span>}
              </button>
            ))}
            <button
              type="button"
              onClick={() =>
                updateOption(
                  "usage",
                  options.usage === "auto"
                    ? "conserve"
                    : options.usage === "conserve"
                      ? "max"
                  : "auto",
                )
              }
              className="flex h-11 w-full items-center justify-between rounded-2xl px-4 text-left text-zinc-950 transition hover:bg-zinc-50"
            >
              <span>Speed</span>
              <span className="text-zinc-400">›</span>
            </button>
          </div>
        ) : null}
      </form>

      <div className="mt-2.5 flex items-center gap-7 px-5 text-xs text-zinc-500">
        <button
          type="button"
          onClick={() => updateOption("access", options.access === "workspace" ? "ask" : "workspace")}
          className="inline-flex items-center gap-2 transition hover:text-zinc-900"
        >
          <LaptopIcon />
          Work locally
          <ChevronDownIcon />
        </button>
        <button
          type="button"
          onClick={() => updateOption("parallel", !options.parallel)}
          className="inline-flex items-center gap-2 transition hover:text-zinc-900"
          title={optionSummary}
        >
          <BranchIcon />
          main
          <ChevronDownIcon />
        </button>
      </div>
    </section>
  );
}
