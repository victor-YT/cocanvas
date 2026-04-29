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

export type CodexComposerInput = {
  text: string;
  mentionIds: string[];
};

export type FeatureMentionInsertRequest = {
  id: string;
  title: string;
  requestId: number;
};

type CodexChatPanelProps = {
  isRunning: boolean;
  mentionRequest?: FeatureMentionInsertRequest;
  onSubmit: (input: CodexComposerInput, options: CodexRunOptions) => boolean;
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

function createMentionElement(mention: FeatureMentionInsertRequest) {
  const element = document.createElement("span");
  element.className =
    "mx-0.5 inline-flex max-w-full cursor-pointer select-none items-center rounded-full bg-emerald-50 px-2 py-0.5 align-baseline text-[13px] font-bold leading-5 text-emerald-800 ring-1 ring-inset ring-emerald-200/80 transition hover:bg-emerald-100";
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

function rangeTextBefore(editor: HTMLElement, range: Range) {
  const beforeRange = range.cloneRange();
  beforeRange.selectNodeContents(editor);
  beforeRange.setEnd(range.startContainer, range.startOffset);

  return beforeRange.toString();
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
    return;
  }

  if (previous && editor.contains(previous)) {
    setCursorAfter(previous);
    return;
  }

  setCursorAtEnd(editor);
}

function removeMentionBeforeCaret(editor: HTMLElement) {
  const selection = window.getSelection();

  if (!selection?.rangeCount) {
    return false;
  }

  const range = selection.getRangeAt(0);

  if (!range.collapsed || !editor.contains(range.startContainer)) {
    return false;
  }

  const container = range.startContainer;
  const offset = range.startOffset;

  if (container.nodeType === Node.TEXT_NODE) {
    const text = container.textContent ?? "";
    const before = text.slice(0, offset);
    const mention = previousSibling(container);

    if (isMentionElement(mention) && /^\s*$/.test(before)) {
      container.textContent = text.slice(offset);
      mention.remove();
      setCursorBefore(container);
      return true;
    }

    return false;
  }

  if (!(container instanceof HTMLElement)) {
    return false;
  }

  const candidate = container.childNodes.item(offset - 1);

  if (isMentionElement(candidate)) {
    const anchor = nextSibling(candidate);
    candidate.remove();
    if (anchor) {
      setCursorBefore(anchor);
    } else {
      setCursorAtEnd(editor);
    }
    return true;
  }

  if (
    candidate?.nodeType === Node.TEXT_NODE &&
    /^\s*$/.test(candidate.textContent ?? "") &&
    isMentionElement(previousSibling(candidate))
  ) {
    const mention = previousSibling(candidate);
    const anchor = nextSibling(candidate);
    candidate.remove();
    mention?.remove();
    if (anchor) {
      setCursorBefore(anchor);
    } else {
      setCursorAtEnd(editor);
    }
    return true;
  }

  return false;
}

function removeMentionAfterCaret(editor: HTMLElement) {
  const selection = window.getSelection();

  if (!selection?.rangeCount) {
    return false;
  }

  const range = selection.getRangeAt(0);

  if (!range.collapsed || !editor.contains(range.startContainer)) {
    return false;
  }

  const container = range.startContainer;
  const offset = range.startOffset;

  if (container.nodeType === Node.TEXT_NODE) {
    const text = container.textContent ?? "";
    const after = text.slice(offset);
    const mention = nextSibling(container);

    if (isMentionElement(mention) && /^\s*$/.test(after)) {
      container.textContent = text.slice(0, offset);
      mention.remove();
      setCursorAfter(container);
      return true;
    }

    return false;
  }

  if (!(container instanceof HTMLElement)) {
    return false;
  }

  const candidate = container.childNodes.item(offset);

  if (isMentionElement(candidate)) {
    const anchor = previousSibling(candidate);
    candidate.remove();
    if (anchor) {
      setCursorAfter(anchor);
    } else {
      setCursorAtEnd(editor);
    }
    return true;
  }

  if (
    candidate?.nodeType === Node.TEXT_NODE &&
    /^\s*$/.test(candidate.textContent ?? "") &&
    isMentionElement(nextSibling(candidate))
  ) {
    const mention = nextSibling(candidate);
    const anchor = previousSibling(candidate);
    candidate.remove();
    mention?.remove();
    if (anchor) {
      setCursorAfter(anchor);
    } else {
      setCursorAtEnd(editor);
    }
    return true;
  }

  return false;
}

export function CodexChatPanel({
  isRunning,
  mentionRequest,
  onSubmit,
}: CodexChatPanelProps) {
  const [options, setOptions] = useState<CodexRunOptions>(defaultOptions);
  const [input, setInput] = useState<CodexComposerInput>({
    text: "",
    mentionIds: [],
  });
  const editorRef = useRef<HTMLDivElement>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const canSubmit = input.text.trim().length > 0 && !isRunning;

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
      }
    }

    document.addEventListener("selectionchange", handleSelectionChange);

    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
    };
  }, []);

  function syncInput() {
    const editor = editorRef.current;

    if (!editor) {
      return;
    }

    setInput(serializeEditor(editor));
  }

  function clearEditor() {
    const editor = editorRef.current;

    if (!editor) {
      return;
    }

    editor.replaceChildren();
    savedRangeRef.current = null;
    setInput({
      text: "",
      mentionIds: [],
    });
  }

  useEffect(() => {
    const editor = editorRef.current;

    if (!editor || !mentionRequest || isRunning) {
      return;
    }

    editor.focus();

    const selection = window.getSelection();
    const savedRange = savedRangeRef.current;
    const range =
      savedRange &&
      editor.contains(savedRange.startContainer) &&
      editor.contains(savedRange.endContainer)
        ? savedRange.cloneRange()
        : endRange(editor);

    selection?.removeAllRanges();
    selection?.addRange(range);
    range.deleteContents();

    const beforeText = rangeTextBefore(editor, range);
    const afterText = rangeTextAfter(editor, range);
    const fragment = document.createDocumentFragment();

    if (beforeText.length > 0 && !/\s$/.test(beforeText)) {
      fragment.append(document.createTextNode(" "));
    }

    const mentionElement = createMentionElement(mentionRequest);
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
    setInput(serializeEditor(editor));
  }, [mentionRequest, isRunning]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

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
        className="rounded-[30px] border border-black/10 bg-white/95 px-4 py-3 shadow-[0_18px_52px_rgba(24,24,27,0.13)] backdrop-blur-xl transition-[box-shadow,transform,border-color] duration-300 focus-within:border-black/15 focus-within:shadow-[0_22px_60px_rgba(24,24,27,0.16)]"
      >
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
                return;
              }

              event.preventDefault();
              editor.focus();
              removeMentionElement(mention, editor);
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

              if (event.key === "Backspace" && removeMentionBeforeCaret(editor)) {
                event.preventDefault();
                syncInput();
                return;
              }

              if (event.key === "Delete" && removeMentionAfterCaret(editor)) {
                event.preventDefault();
                syncInput();
              }
            }}
            className="max-h-[146px] min-h-[52px] w-full overflow-y-auto whitespace-pre-wrap break-words bg-transparent px-1 py-1 text-[15px] font-semibold leading-6 text-zinc-900 outline-none transition-[color] duration-200 ease-out focus:outline-none data-[disabled=true]:cursor-not-allowed data-[disabled=true]:text-zinc-500"
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
