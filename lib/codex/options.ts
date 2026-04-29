export const CODEX_MODEL_OPTIONS = [
  {
    value: "gpt-5.3-codex",
    label: "GPT-5.3 Codex",
  },
  {
    value: "gpt-5.2-codex",
    label: "GPT-5.2 Codex",
  },
  {
    value: "gpt-5.5",
    label: "GPT-5.5",
  },
  {
    value: "gpt-5.4",
    label: "GPT-5.4",
  },
  {
    value: "gpt-5.4-mini",
    label: "GPT-5.4 Mini",
  },
] as const;

export const CODEX_REASONING_EFFORT_OPTIONS = [
  {
    value: "low",
    label: "Low",
  },
  {
    value: "medium",
    label: "Medium",
  },
  {
    value: "high",
    label: "High",
  },
  {
    value: "xhigh",
    label: "XHigh",
  },
] as const;

export type CodexModel = (typeof CODEX_MODEL_OPTIONS)[number]["value"];
export type CodexReasoningEffort =
  (typeof CODEX_REASONING_EFFORT_OPTIONS)[number]["value"];

export const DEFAULT_CODEX_MODEL: CodexModel = "gpt-5.3-codex";
export const DEFAULT_CODEX_REASONING_EFFORT: CodexReasoningEffort = "high";

export function isCodexModel(value: string): value is CodexModel {
  return CODEX_MODEL_OPTIONS.some((option) => option.value === value);
}

export function isCodexReasoningEffort(
  value: string,
): value is CodexReasoningEffort {
  return CODEX_REASONING_EFFORT_OPTIONS.some((option) => option.value === value);
}
