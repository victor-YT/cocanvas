"use client";

import { type FormEvent, useMemo } from "react";
import type { CodexTimelineEvent } from "@/lib/types/codex";
import type { FeatureNode } from "@/lib/types/graph";
import type {
  CodexChatMessage,
  CodexFunctionId,
  CodexRunOptions,
} from "@/components/codex/CodexChatPanel";

type StreamStatus = "connecting" | "connected" | "disconnected";

type NodeSidePanelProps = {
  node?: FeatureNode;
  messages: CodexChatMessage[];
  draft: string;
  streamStatus: StreamStatus;
  timeline: CodexTimelineEvent[];
  onDraftChange: (value: string) => void;
  onSubmit: (options: CodexRunOptions) => void;
  onRunFunction: (id: CodexFunctionId, options: CodexRunOptions) => void;
};

const defaultRunOptions: CodexRunOptions = {
  model: "gpt-5.5",
  speed: "high",
  usage: "auto",
  access: "workspace",
  parallel: true,
};

const actionButtons: Array<{ id: CodexFunctionId; label: string }> = [
  { id: "plan", label: "Plan" },
  { id: "implement", label: "Implement" },
  { id: "test", label: "Test" },
  { id: "review", label: "Review" },
];

const statusTone: Record<StreamStatus, string> = {
  connecting: "bg-amber-100 text-amber-800",
  connected: "bg-emerald-100 text-emerald-800",
  disconnected: "bg-zinc-100 text-zinc-500",
};

function shortPath(path: string) {
  const parts = path.split("/");
  return parts.length > 2 ? parts.slice(-2).join("/") : path;
}

function timelineMatchesNode(event: CodexTimelineEvent, node?: FeatureNode) {
  if (!node) {
    return true;
  }

  if (event.featureIds?.includes(node.id)) {
    return true;
  }

  const artifactPaths = new Set(node.artifacts.map((artifact) => artifact.path));
  return event.paths?.some((path) => artifactPaths.has(path)) ?? false;
}

export function NodeSidePanel({
  node,
  messages,
  draft,
  streamStatus,
  timeline,
  onDraftChange,
  onSubmit,
  onRunFunction,
}: NodeSidePanelProps) {
  const relatedTimeline = useMemo(
    () => timeline.filter((event) => timelineMatchesNode(event, node)).slice(0, 5),
    [node, timeline],
  );
  const latestEvidence = node?.evidence.slice(-5).reverse() ?? [];
  const chatMessages = messages.slice(-4);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(defaultRunOptions);
  }

  return (
    <aside className="flex h-full min-h-[640px] flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm lg:min-h-[calc(100vh-120px)]">
      <div className="border-b border-zinc-200 p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusTone[streamStatus]}`}
          >
            Live {streamStatus}
          </span>
          <span className="text-xs text-zinc-400">Thread 1 canvas</span>
        </div>

        {node ? (
          <>
            <h2 className="text-lg font-semibold leading-6 text-zinc-950">
              {node.name}
            </h2>
            <p className="mt-2 text-sm leading-5 text-zinc-500">
              {node.description ?? "No description is attached yet."}
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-zinc-100 px-2.5 py-1 font-medium capitalize text-zinc-700">
                {node.status.replace("_", " ")}
              </span>
              <span className="rounded-full bg-zinc-100 px-2.5 py-1 font-medium text-zinc-700">
                {Math.round(node.confidence * 100)}% confidence
              </span>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-lg font-semibold text-zinc-950">Select a node</h2>
            <p className="mt-2 text-sm leading-5 text-zinc-500">
              Click a feature to inspect files, evidence, tests, and follow-up work.
            </p>
          </>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <section>
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-zinc-900">Changed files</h3>
            <span className="text-xs text-zinc-400">
              {node?.artifacts.length ?? 0}
            </span>
          </div>
          <div className="mt-2 grid gap-2">
            {node && node.artifacts.length > 0 ? (
              node.artifacts.map((artifact) => (
                <div
                  key={artifact.id}
                  className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate text-sm font-medium text-zinc-800">
                      {shortPath(artifact.path)}
                    </span>
                    <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[11px] font-medium uppercase text-zinc-500">
                      {artifact.kind}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-zinc-500">
                    {artifact.role ?? artifact.evidence}
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-3 text-sm text-zinc-500">
                File changes will attach here from MCP or the git watcher.
              </div>
            )}
          </div>
        </section>

        <section className="mt-5">
          <h3 className="text-sm font-semibold text-zinc-900">Acceptance</h3>
          <div className="mt-2 grid gap-2">
            {node && node.acceptanceCriteria.length > 0 ? (
              node.acceptanceCriteria.map((criterion) => (
                <div
                  key={criterion.id}
                  className="rounded-lg border border-zinc-200 bg-white p-3 text-sm shadow-sm"
                >
                  <p className="leading-5 text-zinc-700">{criterion.text}</p>
                  <span className="mt-2 inline-flex rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium capitalize text-zinc-500">
                    {criterion.status.replace("_", " ")}
                  </span>
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-3 text-sm text-zinc-500">
                Acceptance criteria will appear when the PRD parser creates them.
              </div>
            )}
          </div>
        </section>

        <section className="mt-5">
          <h3 className="text-sm font-semibold text-zinc-900">Evidence</h3>
          <div className="mt-2 grid gap-2">
            {latestEvidence.length > 0 ? (
              latestEvidence.map((item) => (
                <div key={item.id} className="rounded-lg bg-zinc-50 p-3 text-sm">
                  <p className="font-medium text-zinc-800">{item.title}</p>
                  <p className="mt-1 line-clamp-3 text-xs leading-5 text-zinc-500">
                    {item.detail}
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-3 text-sm text-zinc-500">
                Plans, diffs, commands, and test output will stream here.
              </div>
            )}
          </div>
        </section>

        <section className="mt-5">
          <h3 className="text-sm font-semibold text-zinc-900">Live timeline</h3>
          <div className="mt-2 grid gap-2">
            {relatedTimeline.length > 0 ? (
              relatedTimeline.map((event) => (
                <div key={event.id} className="rounded-lg bg-zinc-50 p-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate font-medium text-zinc-800">{event.title}</p>
                    <span className="shrink-0 text-[11px] uppercase text-zinc-400">
                      {event.type.replace("_", " ")}
                    </span>
                  </div>
                  {event.detail ? (
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-zinc-500">
                      {event.detail}
                    </p>
                  ) : null}
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-3 text-sm text-zinc-500">
                Waiting for SSE events from the backend event store.
              </div>
            )}
          </div>
        </section>
      </div>

      <div className="border-t border-zinc-200 p-4">
        <div className="mb-3 grid grid-cols-4 gap-2">
          {actionButtons.map((action) => (
            <button
              key={action.id}
              type="button"
              disabled={!node}
              onClick={() => onRunFunction(action.id, defaultRunOptions)}
              className="rounded-lg border border-zinc-200 bg-white px-2 py-2 text-xs font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400"
            >
              {action.label}
            </button>
          ))}
        </div>

        {chatMessages.length > 0 ? (
          <div className="mb-3 grid max-h-32 gap-2 overflow-y-auto rounded-lg bg-zinc-50 p-2">
            {chatMessages.map((message) => (
              <p
                key={message.id}
                className={`rounded-md px-2 py-1 text-xs leading-5 ${
                  message.role === "user"
                    ? "bg-zinc-950 text-white"
                    : "bg-white text-zinc-600"
                }`}
              >
                {message.text}
              </p>
            ))}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            value={draft}
            onChange={(event) => onDraftChange(event.target.value)}
            disabled={!node}
            placeholder={node ? `Ask Codex about ${node.name}` : "Select a node to chat"}
            className="min-w-0 flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 disabled:bg-zinc-100"
          />
          <button
            type="submit"
            disabled={!node || draft.trim().length === 0}
            className="rounded-lg bg-zinc-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-300"
          >
            Send
          </button>
        </form>
      </div>
    </aside>
  );
}
