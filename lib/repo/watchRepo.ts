import { execFile } from "node:child_process";
import { resolve } from "node:path";
import { promisify } from "node:util";
import type { CodexTimelineEvent } from "@/lib/types/codex";

const execFileAsync = promisify(execFile);
const DEFAULT_POLL_INTERVAL_MS = 2_000;
const MAX_DIFF_CHARS = 12_000;

type GitStatusKind =
  | "modified"
  | "added"
  | "deleted"
  | "renamed"
  | "copied"
  | "untracked"
  | "conflict"
  | "unknown";

export type RepoChangedFile = {
  path: string;
  status: GitStatusKind;
  indexStatus: string;
  worktreeStatus: string;
};

export type RepoWatchSnapshot = {
  repoPath: string;
  changedFiles: RepoChangedFile[];
  diffNameOnly: string[];
  conflictedFiles: string[];
  diff?: string;
  capturedAt: string;
};

export type RepoWatchOptions = {
  pollIntervalMs?: number;
  onEvent?: (event: CodexTimelineEvent, snapshot: RepoWatchSnapshot) => void;
  onError?: (error: Error) => void;
  startImmediately?: boolean;
};

const UNMERGED_STATUS_CODES = new Set([
  "DD",
  "AU",
  "UD",
  "UA",
  "DU",
  "AA",
  "UU",
]);

function normalizePath(path: string) {
  return path.replaceAll("\\", "/");
}

function parsePorcelainLine(line: string): RepoChangedFile | undefined {
  if (line.length < 4) {
    return undefined;
  }

  const indexStatus = line[0] ?? " ";
  const worktreeStatus = line[1] ?? " ";
  const statusCode = `${indexStatus}${worktreeStatus}`;
  const rawPath = line.slice(3);
  const path = normalizePath(
    rawPath.includes(" -> ")
      ? rawPath.split(" -> ").at(-1) ?? rawPath
      : rawPath,
  );
  const status = classifyStatus(statusCode, indexStatus, worktreeStatus);

  return {
    path,
    status,
    indexStatus,
    worktreeStatus,
  };
}

function classifyStatus(
  statusCode: string,
  indexStatus: string,
  worktreeStatus: string,
): GitStatusKind {
  if (UNMERGED_STATUS_CODES.has(statusCode)) {
    return "conflict";
  }

  if (statusCode === "??") {
    return "untracked";
  }

  if (indexStatus === "R" || worktreeStatus === "R") {
    return "renamed";
  }

  if (indexStatus === "C" || worktreeStatus === "C") {
    return "copied";
  }

  if (indexStatus === "A" || worktreeStatus === "A") {
    return "added";
  }

  if (indexStatus === "D" || worktreeStatus === "D") {
    return "deleted";
  }

  if (indexStatus === "M" || worktreeStatus === "M") {
    return "modified";
  }

  return "unknown";
}

function parseLines(output: string) {
  return output
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function unique(values: string[]) {
  return [...new Set(values)];
}

function snapshotKey(snapshot: RepoWatchSnapshot) {
  return JSON.stringify({
    changedFiles: snapshot.changedFiles.map((file) => [
      file.path,
      file.status,
      file.indexStatus,
      file.worktreeStatus,
    ]),
    diffNameOnly: snapshot.diffNameOnly,
    conflictedFiles: snapshot.conflictedFiles,
    diff: snapshot.diff,
  });
}

function eventId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function buildEvents(snapshot: RepoWatchSnapshot): CodexTimelineEvent[] {
  const events: CodexTimelineEvent[] = [];
  const paths = snapshot.changedFiles.map((file) => file.path);

  if (paths.length > 0) {
    events.push({
      id: eventId("repo-change"),
      type: "file_change",
      title: "Git watcher detected changed files",
      detail: summarizeChangedFiles(snapshot.changedFiles),
      timestamp: snapshot.capturedAt,
      paths,
      raw: {
        source: "git-watcher",
        changedFiles: snapshot.changedFiles,
      },
    });
  }

  if (snapshot.diffNameOnly.length > 0 || snapshot.diff) {
    events.push({
      id: eventId("repo-diff"),
      type: "diff_updated",
      title: "Git diff updated",
      detail:
        snapshot.diffNameOnly.length > 0
          ? `git diff --name-only: ${snapshot.diffNameOnly.join(", ")}`
          : "Working tree diff changed.",
      timestamp: snapshot.capturedAt,
      paths: snapshot.diffNameOnly,
      diff: snapshot.diff,
      raw: {
        source: "git-watcher",
        command: "git diff --name-only",
      },
    });
  }

  if (snapshot.conflictedFiles.length > 0) {
    events.push({
      id: eventId("repo-conflict"),
      type: "conflict_detected",
      title: "Git conflict detected",
      detail: `Unmerged files: ${snapshot.conflictedFiles.join(", ")}`,
      timestamp: snapshot.capturedAt,
      paths: snapshot.conflictedFiles,
      raw: {
        source: "git-watcher",
        conflictedFiles: snapshot.conflictedFiles,
      },
    });
  }

  return events;
}

function summarizeChangedFiles(files: RepoChangedFile[]) {
  const byStatus = files.reduce<Record<string, number>>((counts, file) => {
    counts[file.status] = (counts[file.status] ?? 0) + 1;
    return counts;
  }, {});

  return Object.entries(byStatus)
    .map(([status, count]) => `${count} ${status}`)
    .join(", ");
}

async function runGit(repoPath: string, args: string[]) {
  const { stdout } = await execFileAsync("git", args, {
    cwd: repoPath,
    maxBuffer: 1024 * 1024 * 8,
  });

  return stdout;
}

export async function readRepoWatchSnapshot(
  repoPath: string,
): Promise<RepoWatchSnapshot> {
  const resolvedRepoPath = resolve(process.cwd(), repoPath || ".");
  const [statusOutput, diffNameOutput, stagedDiffNameOutput, diffOutput] =
    await Promise.all([
      runGit(resolvedRepoPath, ["status", "--porcelain"]),
      runGit(resolvedRepoPath, ["diff", "--name-only"]),
      runGit(resolvedRepoPath, ["diff", "--cached", "--name-only"]),
      runGit(resolvedRepoPath, ["diff", "--no-ext-diff", "--unified=3"]),
    ]);
  const changedFiles = statusOutput
    .split("\n")
    .map(parsePorcelainLine)
    .filter((file): file is RepoChangedFile => Boolean(file));
  const diffNameOnly = unique([
    ...parseLines(diffNameOutput),
    ...parseLines(stagedDiffNameOutput),
  ]).map(normalizePath);
  const conflictedFiles = changedFiles
    .filter((file) => file.status === "conflict")
    .map((file) => file.path);
  const diff =
    diffOutput.length > MAX_DIFF_CHARS
      ? `${diffOutput.slice(0, MAX_DIFF_CHARS)}\n\n[diff truncated by git watcher]\n`
      : diffOutput;

  return {
    repoPath: resolvedRepoPath,
    changedFiles,
    diffNameOnly,
    conflictedFiles,
    diff,
    capturedAt: new Date().toISOString(),
  };
}

export function createRepoWatchEvents(snapshot: RepoWatchSnapshot) {
  return buildEvents(snapshot);
}

export function watchRepo(repoPath: string, options: RepoWatchOptions = {}) {
  const pollIntervalMs = options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  let closed = false;
  let running = false;
  let lastKey = "";
  let timer: NodeJS.Timeout | undefined;
  let latestSnapshot: RepoWatchSnapshot | undefined;

  async function pollNow() {
    if (closed || running) {
      return latestSnapshot;
    }

    running = true;

    try {
      const snapshot = await readRepoWatchSnapshot(repoPath);
      const key = snapshotKey(snapshot);
      latestSnapshot = snapshot;

      if (key !== lastKey) {
        lastKey = key;

        for (const event of buildEvents(snapshot)) {
          options.onEvent?.(event, snapshot);
        }
      }

      return snapshot;
    } catch (error) {
      options.onError?.(
        error instanceof Error ? error : new Error(String(error)),
      );
      return latestSnapshot;
    } finally {
      running = false;
    }
  }

  function schedule() {
    timer = setInterval(() => {
      void pollNow();
    }, pollIntervalMs);
  }

  if (options.startImmediately !== false) {
    void pollNow();
    schedule();
  }

  return {
    pollNow,
    getSnapshot() {
      return latestSnapshot;
    },
    close() {
      closed = true;

      if (timer) {
        clearInterval(timer);
      }
    },
  };
}
