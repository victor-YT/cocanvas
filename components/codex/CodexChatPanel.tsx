"use client";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
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

export type CodexComposerInput = {
  text: string;
  mentionIds: string[];
};

export type FeatureMentionOption = {
  id: string;
  title: string;
  status?: string;
};

export type FeatureMentionInsertRequest = FeatureMentionOption & {
  requestId: number;
};

type CodexChatPanelProps = {
  isRunning: boolean;
  insertMentionRequest?: FeatureMentionInsertRequest;
  mentionOptions: FeatureMentionOption[];
  onMentionRemoved?: (mentionId: string) => void;
  onSubmit: (input: CodexComposerInput, options: CodexRunOptions) => boolean;
};

type PickerOption<T extends string> = {
  value: T;
  label: string;
};

type MentionTrigger = {
  query: string;
  range: Range;
  activeIndex: number;
};

const minEditorHeight = 52;
const maxEditorHeight = 146;

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
        className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-full bg-transparent px-1.5 text-xs font-bold text-zinc-400 transition hover:text-zinc-600 focus-visible:ring-2 focus-visible:ring-zinc-200 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {icon}
        <span className="whitespace-nowrap">{selected.label}</span>
        <span className="rotate-180 text-zinc-400">
          <ChevronIcon />
        </span>
      </button>

      {open ? (
        <div className="absolute bottom-full right-0 z-50 mb-2 w-max min-w-full rounded-2xl border border-black/10 bg-white p-1.5 shadow-[0_14px_36px_rgba(24,24,27,0.14)]">
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

function isMentionElement(node: Node | null): node is HTMLElement {
  return node instanceof HTMLElement && node.dataset.mentionId !== undefined;
}

function mentionStatusTone(status?: string) {
  if (status === "risk") {
    return "bg-rose-50 text-rose-700 ring-rose-200/80 hover:bg-rose-100";
  }

  if (status === "implemented") {
    return "bg-blue-50 text-blue-700 ring-blue-200/80 hover:bg-blue-100";
  }

  if (status === "verified" || status === "building") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200/80 hover:bg-emerald-100";
  }

  if (status === "unlinked") {
    return "bg-purple-50 text-purple-700 ring-purple-200/80 hover:bg-purple-100";
  }

  return "bg-zinc-100 text-zinc-600 ring-zinc-200/80 hover:bg-zinc-200";
}

function statusLabelForMention(status?: string) {
  if (!status) {
    return "mapped";
  }

  return status.replaceAll("_", " ");
}

function createMentionElement(mention: FeatureMentionOption) {
  const element = document.createElement("span");
  element.className =
    `cocanvas-feature-mention mx-0.5 inline-flex max-w-full select-none items-center rounded-full px-2 py-0.5 align-baseline text-[13px] font-bold leading-5 ring-1 ring-inset ${mentionStatusTone(mention.status)}`;
  element.contentEditable = "false";
  element.dataset.mentionId = mention.id;
  element.dataset.mentionTitle = mention.title;
  element.textContent = `@${mention.title}`;

  return element;
}

function serializeEditor(editor: HTMLElement): CodexComposerInput {
  const pieces: string[] = [];
  const mentionIds: string[] = [];

  function visit(node: Node) {
    if (node.nodeType === Node.TEXT_NODE) {
      pieces.push(node.textContent ?? "");
      return;
    }

    if (!(node instanceof HTMLElement)) {
      return;
    }

    const element = node as HTMLElement;

    if (element.dataset.mentionId !== undefined) {
      pieces.push(
        `@${element.dataset.mentionTitle ?? element.textContent?.replace(/^@/, "") ?? ""}`,
      );
      mentionIds.push(element.dataset.mentionId ?? "");
      return;
    }

    if (element.tagName === "BR") {
      pieces.push("\n");
      return;
    }

    const isBlock =
      element !== editor && (element.tagName === "DIV" || element.tagName === "P");

    if (isBlock && pieces.length > 0 && !pieces.at(-1)?.endsWith("\n")) {
      pieces.push("\n");
    }

    element.childNodes.forEach(visit);

    if (isBlock && pieces.length > 0 && !pieces.at(-1)?.endsWith("\n")) {
      pieces.push("\n");
    }
  }

  editor.childNodes.forEach(visit);

  return {
    text: pieces.join("").replace(/\n{3,}/g, "\n\n"),
    mentionIds: mentionIds.filter(Boolean),
  };
}

function endRange(editor: HTMLElement) {
  const range = document.createRange();
  range.selectNodeContents(editor);
  range.collapse(false);

  return range;
}

function editorOwnsRange(editor: HTMLElement, range: Range | null) {
  return Boolean(
    range &&
      editor.contains(range.startContainer) &&
      editor.contains(range.endContainer),
  );
}

function rangeTextAfter(editor: HTMLElement, range: Range) {
  const afterRange = range.cloneRange();
  afterRange.selectNodeContents(editor);
  afterRange.setStart(range.startContainer, range.startOffset);

  return afterRange.toString();
}

function previousSibling(node: Node | null) {
  let current = node?.previousSibling ?? null;

  while (
    current?.nodeType === Node.TEXT_NODE &&
    (current.textContent ?? "").length === 0
  ) {
    current = current.previousSibling;
  }

  return current;
}

function nextSibling(node: Node | null) {
  let current = node?.nextSibling ?? null;

  while (
    current?.nodeType === Node.TEXT_NODE &&
    (current.textContent ?? "").length === 0
  ) {
    current = current.nextSibling;
  }

  return current;
}

function setCursorBefore(node: Node) {
  const selection = window.getSelection();
  const range = document.createRange();
  range.setStartBefore(node);
  range.collapse(true);
  selection?.removeAllRanges();
  selection?.addRange(range);
}

function setCursorAfter(node: Node) {
  const selection = window.getSelection();
  const range = document.createRange();
  range.setStartAfter(node);
  range.collapse(true);
  selection?.removeAllRanges();
  selection?.addRange(range);
}

function setCursorAtEnd(editor: HTMLElement) {
  const selection = window.getSelection();
  const range = endRange(editor);
  selection?.removeAllRanges();
  selection?.addRange(range);
}

function clickedMentionElement(target: EventTarget | null, editor: HTMLElement) {
  if (!(target instanceof HTMLElement)) {
    return null;
  }

  const mention = target.closest<HTMLElement>("[data-mention-id]");

  if (!mention || !editor.contains(mention)) {
    return null;
  }

  return mention;
}

function removeMentionElement(mention: HTMLElement, editor: HTMLElement) {
  const mentionId = mention.dataset.mentionId;
  const previous = previousSibling(mention);
  const next = nextSibling(mention);

  if (next?.nodeType === Node.TEXT_NODE) {
    const nextText = next.textContent ?? "";
    const previousText = previous?.textContent ?? "";

    if ((!previous || /\s$/.test(previousText)) && /^\s/.test(nextText)) {
      next.textContent = nextText.replace(/^\s/, "");
    }
  }

  mention.remove();

  if (next && editor.contains(next)) {
    setCursorBefore(next);
    return mentionId;
  }

  if (previous && editor.contains(previous)) {
    setCursorAfter(previous);
    return mentionId;
  }

  setCursorAtEnd(editor);
  return mentionId;
}

function removeMentionBeforeCaret(editor: HTMLElement) {
  const selection = window.getSelection();

  if (!selection?.rangeCount) {
    return undefined;
  }

  const range = selection.getRangeAt(0);

  if (!range.collapsed || !editor.contains(range.startContainer)) {
    return undefined;
  }

  const container = range.startContainer;
  const offset = range.startOffset;

  if (container.nodeType === Node.TEXT_NODE) {
    const text = container.textContent ?? "";
    const before = text.slice(0, offset);
    const mention = previousSibling(container);

    if (isMentionElement(mention) && /^\s*$/.test(before)) {
      const mentionId = mention.dataset.mentionId;
      container.textContent = text.slice(offset);
      mention.remove();
      setCursorBefore(container);
      return mentionId;
    }

    return undefined;
  }

  if (!(container instanceof HTMLElement)) {
    return undefined;
  }

  const candidate = container.childNodes.item(offset - 1);

  if (isMentionElement(candidate)) {
    const mentionId = candidate.dataset.mentionId;
    const anchor = nextSibling(candidate);
    candidate.remove();
    if (anchor) {
      setCursorBefore(anchor);
    } else {
      setCursorAtEnd(editor);
    }
    return mentionId;
  }

  if (
    candidate?.nodeType === Node.TEXT_NODE &&
    /^\s*$/.test(candidate.textContent ?? "") &&
    isMentionElement(previousSibling(candidate))
  ) {
    const mention = previousSibling(candidate);
    const mentionId = isMentionElement(mention) ? mention.dataset.mentionId : undefined;
    const anchor = nextSibling(candidate);
    candidate.remove();
    mention?.remove();
    if (anchor) {
      setCursorBefore(anchor);
    } else {
      setCursorAtEnd(editor);
    }
    return mentionId;
  }

  return undefined;
}

function removeMentionAfterCaret(editor: HTMLElement) {
  const selection = window.getSelection();

  if (!selection?.rangeCount) {
    return undefined;
  }

  const range = selection.getRangeAt(0);

  if (!range.collapsed || !editor.contains(range.startContainer)) {
    return undefined;
  }

  const container = range.startContainer;
  const offset = range.startOffset;

  if (container.nodeType === Node.TEXT_NODE) {
    const text = container.textContent ?? "";
    const after = text.slice(offset);
    const mention = nextSibling(container);

    if (isMentionElement(mention) && /^\s*$/.test(after)) {
      const mentionId = mention.dataset.mentionId;
      container.textContent = text.slice(0, offset);
      mention.remove();
      setCursorAfter(container);
      return mentionId;
    }

    return undefined;
  }

  if (!(container instanceof HTMLElement)) {
    return undefined;
  }

  const candidate = container.childNodes.item(offset);

  if (isMentionElement(candidate)) {
    const mentionId = candidate.dataset.mentionId;
    const anchor = previousSibling(candidate);
    candidate.remove();
    if (anchor) {
      setCursorAfter(anchor);
    } else {
      setCursorAtEnd(editor);
    }
    return mentionId;
  }

  if (
    candidate?.nodeType === Node.TEXT_NODE &&
    /^\s*$/.test(candidate.textContent ?? "") &&
    isMentionElement(nextSibling(candidate))
  ) {
    const mention = nextSibling(candidate);
    const mentionId = isMentionElement(mention) ? mention.dataset.mentionId : undefined;
    const anchor = previousSibling(candidate);
    candidate.remove();
    mention?.remove();
    if (anchor) {
      setCursorAfter(anchor);
    } else {
      setCursorAtEnd(editor);
    }
    return mentionId;
  }

  return undefined;
}

function detectMentionTrigger(editor: HTMLElement): Omit<MentionTrigger, "activeIndex"> | null {
  const selection = window.getSelection();

  if (!selection?.rangeCount) {
    return null;
  }

  const range = selection.getRangeAt(0);

  if (!range.collapsed || !editor.contains(range.startContainer)) {
    return null;
  }

  if (range.startContainer.nodeType !== Node.TEXT_NODE) {
    return null;
  }

  const text = range.startContainer.textContent ?? "";
  const beforeCaret = text.slice(0, range.startOffset);
  const match = beforeCaret.match(/(?:^|\s)@([A-Za-z0-9 _./-]{0,48})$/);

  if (!match) {
    return null;
  }

  const query = match[1];
  const triggerRange = document.createRange();
  triggerRange.setStart(range.startContainer, range.startOffset - query.length - 1);
  triggerRange.setEnd(range.startContainer, range.startOffset);

  return {
    query,
    range: triggerRange,
  };
}

function mentionMatches(options: FeatureMentionOption[], query: string) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return options.slice(0, 7);
  }

  return options
    .filter((option) => option.title.toLowerCase().includes(normalizedQuery))
    .slice(0, 7);
}

export function CodexChatPanel({
  isRunning,
  insertMentionRequest,
  mentionOptions,
  onMentionRemoved,
  onSubmit,
}: CodexChatPanelProps) {
  const [options, setOptions] = useState<CodexRunOptions>(defaultOptions);
  const [input, setInput] = useState<CodexComposerInput>({
    text: "",
    mentionIds: [],
  });
  const [mentionTrigger, setMentionTrigger] = useState<MentionTrigger | null>(null);
  const [editorHeight, setEditorHeight] = useState(minEditorHeight);
  const editorRef = useRef<HTMLDivElement>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const canSubmit = input.text.trim().length > 0 && !isRunning;
  const visibleMentionOptions = mentionTrigger
    ? mentionMatches(mentionOptions, mentionTrigger.query)
    : [];

  useEffect(() => {
    function handleSelectionChange() {
      const editor = editorRef.current;
      const selection = window.getSelection();

      if (
        editor &&
        selection?.rangeCount &&
        selection.anchorNode &&
        editor.contains(selection.anchorNode)
      ) {
        savedRangeRef.current = selection.getRangeAt(0).cloneRange();
        return;
      }

      setMentionTrigger(null);
    }

    document.addEventListener("selectionchange", handleSelectionChange);

    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
    };
  }, []);

  function refreshMentionTrigger() {
    const editor = editorRef.current;

    if (!editor || isRunning || mentionOptions.length === 0) {
      setMentionTrigger(null);
      return;
    }

    const trigger = detectMentionTrigger(editor);

    if (!trigger) {
      setMentionTrigger(null);
      return;
    }

    const matches = mentionMatches(mentionOptions, trigger.query);

    setMentionTrigger((current) => ({
      ...trigger,
      activeIndex:
        current?.query === trigger.query
          ? Math.min(current.activeIndex, Math.max(matches.length - 1, 0))
          : 0,
    }));
  }

  function updateEditorHeight() {
    window.requestAnimationFrame(() => {
      const editor = editorRef.current;

      if (!editor) {
        return;
      }

      setEditorHeight(
        Math.min(Math.max(editor.scrollHeight, minEditorHeight), maxEditorHeight),
      );
    });
  }

  function syncInput() {
    const editor = editorRef.current;

    if (!editor) {
      return;
    }

    setInput(serializeEditor(editor));
    refreshMentionTrigger();
    updateEditorHeight();
  }

  function clearEditor() {
    const editor = editorRef.current;

    if (!editor) {
      return;
    }

    editor.replaceChildren();
    savedRangeRef.current = null;
    setMentionTrigger(null);
    setEditorHeight(minEditorHeight);
    setInput({
      text: "",
      mentionIds: [],
    });
  }

  function insertMentionAtRange(option: FeatureMentionOption, range: Range) {
    const editor = editorRef.current;

    if (!editor || isRunning) {
      return;
    }

    editor.focus();

    const selection = window.getSelection();

    selection?.removeAllRanges();
    selection?.addRange(range);
    range.deleteContents();

    const afterText = rangeTextAfter(editor, range);
    const fragment = document.createDocumentFragment();
    const mentionElement = createMentionElement(option);
    const trailingSpace = document.createTextNode(
      afterText.length > 0 && /^\s/.test(afterText) ? "" : " ",
    );

    fragment.append(mentionElement);
    fragment.append(trailingSpace);
    range.insertNode(fragment);

    const nextRange = document.createRange();
    nextRange.setStartAfter(trailingSpace);
    nextRange.collapse(true);
    selection?.removeAllRanges();
    selection?.addRange(nextRange);
    savedRangeRef.current = nextRange.cloneRange();
    setMentionTrigger(null);
    setInput(serializeEditor(editor));
    updateEditorHeight();
  }

  useEffect(() => {
    const editor = editorRef.current;

    if (!editor || !insertMentionRequest || isRunning) {
      return;
    }

    const baseRange = editorOwnsRange(editor, savedRangeRef.current)
      ? savedRangeRef.current?.cloneRange()
      : endRange(editor);

    if (baseRange) {
      insertMentionAtRange(insertMentionRequest, baseRange);
    }
    // requestId intentionally makes repeated requests for the same feature explicit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [insertMentionRequest?.requestId]);

  function insertMention(option: FeatureMentionOption) {
    const editor = editorRef.current;
    const trigger = mentionTrigger;

    if (!editor || !trigger || isRunning) {
      return;
    }

    insertMentionAtRange(option, trigger.range.cloneRange());
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submitCurrentInput();
  }

  function submitCurrentInput() {
    if (!canSubmit) {
      return;
    }

    if (onSubmit(input, options)) {
      clearEditor();
    }
  }

  return (
    <section className="pointer-events-auto w-full max-w-[640px] text-zinc-950">
      <form
        onSubmit={handleSubmit}
        className="relative rounded-[30px] border border-black/10 bg-white/95 px-4 py-3 shadow-[0_18px_52px_rgba(24,24,27,0.13)] backdrop-blur-xl transition-[box-shadow,transform,border-color] duration-300 focus-within:border-black/15 focus-within:shadow-[0_22px_60px_rgba(24,24,27,0.16)]"
      >
        {mentionTrigger ? (
          <div className="cocanvas-mention-menu absolute bottom-full left-0 z-50 mb-3 w-full overflow-hidden rounded-[24px] border border-black/10 bg-white/96 p-2 shadow-[0_18px_52px_rgba(24,24,27,0.16)] backdrop-blur-xl">
            {visibleMentionOptions.length > 0 ? (
              <div className="grid gap-1">
                {visibleMentionOptions.map((option, index) => (
                  <button
                    key={option.id}
                    type="button"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      insertMention(option);
                    }}
                    onMouseEnter={() => {
                      setMentionTrigger((current) =>
                        current ? { ...current, activeIndex: index } : current,
                      );
                    }}
                    className={`flex cursor-pointer items-center justify-between gap-3 rounded-2xl px-3 py-2 text-left transition ${
                      index === mentionTrigger.activeIndex
                        ? "bg-zinc-50 text-zinc-950 shadow-sm ring-1 ring-zinc-200"
                        : "text-zinc-800 hover:bg-zinc-100"
                    }`}
                  >
                    <span className="min-w-0 truncate text-sm font-bold">
                      @{option.title}
                    </span>
                    {option.status ? (
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ring-1 ring-inset ${mentionStatusTone(option.status)}`}
                      >
                        {statusLabelForMention(option.status)}
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl px-3 py-2 text-sm font-semibold text-zinc-400">
                No matching feature
              </div>
            )}
          </div>
        ) : null}

        <div className="relative">
          {input.text.trim().length === 0 ? (
            <div className="pointer-events-none absolute left-1 top-1 text-[15px] font-semibold leading-6 text-zinc-400">
              Ask Codex to build or change this repo.
            </div>
          ) : null}
          <div
            ref={editorRef}
            contentEditable={!isRunning}
            role="textbox"
            aria-label="Codex prompt"
            aria-multiline="true"
            spellCheck
            suppressContentEditableWarning
            onInput={syncInput}
            onKeyUp={syncInput}
            onMouseDown={(event) => {
              const editor = editorRef.current;

              if (!editor || isRunning) {
                return;
              }

              const mention = clickedMentionElement(event.target, editor);

              if (!mention) {
                if (input.text.trim().length === 0) {
                  event.preventDefault();
                  editor.focus();
                  setCursorAtEnd(editor);
                }
                return;
              }

              event.preventDefault();
              editor.focus();
              const removedMentionId = removeMentionElement(mention, editor);
              if (removedMentionId) {
                onMentionRemoved?.(removedMentionId);
              }
              syncInput();
            }}
            onMouseUp={syncInput}
            onPaste={(event) => {
              event.preventDefault();
              const text = event.clipboardData.getData("text/plain");
              const selection = window.getSelection();

              if (!selection?.rangeCount) {
                return;
              }

              const range = selection.getRangeAt(0);
              range.deleteContents();
              const textNode = document.createTextNode(text);
              range.insertNode(textNode);
              setCursorAfter(textNode);
              syncInput();
            }}
            onKeyDown={(event) => {
              const editor = editorRef.current;

              if (!editor) {
                return;
              }

              if (
                event.key === "Enter" &&
                !event.shiftKey &&
                !event.metaKey &&
                !event.ctrlKey &&
                !event.altKey &&
                !mentionTrigger
              ) {
                event.preventDefault();
                submitCurrentInput();
                return;
              }

              if (mentionTrigger) {
                if (event.key === "Escape") {
                  event.preventDefault();
                  setMentionTrigger(null);
                  return;
                }

                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  setMentionTrigger((current) =>
                    current
                      ? {
                          ...current,
                          activeIndex: Math.min(
                            current.activeIndex + 1,
                            Math.max(visibleMentionOptions.length - 1, 0),
                          ),
                        }
                      : current,
                  );
                  return;
                }

                if (event.key === "ArrowUp") {
                  event.preventDefault();
                  setMentionTrigger((current) =>
                    current
                      ? {
                          ...current,
                          activeIndex: Math.max(current.activeIndex - 1, 0),
                        }
                      : current,
                  );
                  return;
                }

                if (
                  (event.key === "Enter" || event.key === "Tab") &&
                  visibleMentionOptions.length > 0
                ) {
                  event.preventDefault();
                  insertMention(
                    visibleMentionOptions[
                      Math.min(mentionTrigger.activeIndex, visibleMentionOptions.length - 1)
                    ],
                  );
                  return;
                }
              }

              if (event.key === "Backspace") {
                const removedMentionId = removeMentionBeforeCaret(editor);

                if (removedMentionId) {
                  event.preventDefault();
                  onMentionRemoved?.(removedMentionId);
                  syncInput();
                  return;
                }
              }

              if (event.key === "Delete") {
                const removedMentionId = removeMentionAfterCaret(editor);

                if (removedMentionId) {
                  event.preventDefault();
                  onMentionRemoved?.(removedMentionId);
                  syncInput();
                }
              }
            }}
            className="w-full overflow-y-auto whitespace-pre-wrap break-words bg-transparent px-1 py-1 text-[15px] font-semibold leading-6 text-zinc-900 outline-none transition-[height,color] duration-200 ease-out focus:outline-none data-[disabled=true]:cursor-not-allowed data-[disabled=true]:text-zinc-500"
            style={{ height: editorHeight }}
            data-disabled={isRunning}
          />
        </div>

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
              aria-label={isRunning ? "Codex is running" : "Run Codex"}
              disabled={!canSubmit}
              className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-zinc-950 text-white shadow-[0_8px_18px_rgba(24,24,27,0.16)] transition hover:bg-zinc-800 focus-visible:ring-2 focus-visible:ring-zinc-300 disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-400 disabled:shadow-none"
            >
              {isRunning ? <SpinnerIcon /> : <ArrowUpIcon />}
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}
