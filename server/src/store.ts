import type {
  CanvasEvent,
  CanvasMessage,
  CodexThread,
  CodexThreadStatus,
  FeatureNode,
  FeatureStatus,
  GraphSnapshot,
  MessageRole,
  NodeContext,
  RiskLevel,
  TestStatus,
} from "./types.ts";

type CreateNodeInput = {
  title: string;
  description?: string;
  originalPrompt?: string;
  threadId?: string;
  worktreePath?: string;
};

type UpdateNodeInput = {
  status?: FeatureStatus;
  summary?: string;
  changedFiles?: string[];
  diffSummary?: string;
  testStatus?: TestStatus;
  testCommand?: string;
  testOutputSummary?: string;
  riskLevel?: RiskLevel;
  riskReasons?: string[];
  linkedThreadIds?: string[];
  linkedWorktreePaths?: string[];
};

type CreateThreadInput = {
  nodeId: string;
  title?: string;
  originalPrompt: string;
  worktreePath?: string;
  branchName?: string;
  status?: CodexThreadStatus;
};

type CreateMessageInput = {
  nodeId: string;
  threadId?: string;
  role: MessageRole;
  content: string;
};

const MAX_EVENTS = 500;
const MAX_RECENT_MESSAGES = 12;

export class CanvasStore {
  private nodes = new Map<string, FeatureNode>();
  private threads = new Map<string, CodexThread>();
  private events: CanvasEvent[] = [];
  private messages: CanvasMessage[] = [];

  snapshot(): GraphSnapshot {
    const conflicts = this.events.filter(
      (event): event is Extract<CanvasEvent, { type: "conflict.detected" }> =>
        event.type === "conflict.detected",
    );

    return {
      nodes: Array.from(this.nodes.values()),
      threads: Array.from(this.threads.values()),
      events: [...this.events],
      conflicts,
    };
  }

  getNode(nodeId: string) {
    return this.nodes.get(nodeId);
  }

  createNode(input: CreateNodeInput) {
    const now = new Date().toISOString();
    const nodeId = toId("node", input.title);
    const linkedThreadIds = input.threadId ? [input.threadId] : [];
    const linkedWorktreePaths = input.worktreePath ? [input.worktreePath] : [];

    const node: FeatureNode = {
      id: uniqueId(nodeId, (id) => this.nodes.has(id)),
      title: input.title,
      description: input.description,
      originalPrompt: input.originalPrompt ?? input.description ?? input.title,
      status: "planning",
      linkedThreadIds,
      linkedWorktreePaths,
      changedFiles: [],
      testStatus: "unknown",
      riskLevel: "low",
      riskReasons: [],
      createdAt: now,
      lastUpdatedAt: now,
    };

    this.nodes.set(node.id, node);

    const events: CanvasEvent[] = [
      {
        id: createEventId("node-created"),
        type: "node.created",
        nodeId: node.id,
        title: node.title,
        timestamp: now,
      },
    ];

    if (input.threadId) {
      this.threads.set(input.threadId, {
        id: input.threadId,
        nodeId: node.id,
        title: node.title,
        status: "running",
        worktreePath: input.worktreePath,
        originalPrompt: node.originalPrompt,
        messages: [],
        changedFiles: [],
        createdAt: now,
        updatedAt: now,
      });

      events.push({
        id: createEventId("thread-started"),
        type: "thread.started",
        nodeId: node.id,
        threadId: input.threadId,
        timestamp: now,
      });
    }

    this.recordEvents(events);

    return { node, events };
  }

  updateNode(nodeId: string, input: UpdateNodeInput) {
    const node = this.requireNode(nodeId);
    const now = new Date().toISOString();
    const previousStatus = node.status;
    const previousFiles = new Set(node.changedFiles);

    const nextFiles = input.changedFiles
      ? mergeUnique(node.changedFiles, input.changedFiles)
      : node.changedFiles;

    const nextNode: FeatureNode = {
      ...node,
      status: input.status ?? node.status,
      summary: input.summary ?? node.summary,
      changedFiles: nextFiles,
      diffSummary: input.diffSummary ?? node.diffSummary,
      testStatus: input.testStatus ?? node.testStatus,
      testCommand: input.testCommand ?? node.testCommand,
      testOutputSummary: input.testOutputSummary ?? node.testOutputSummary,
      riskLevel: input.riskLevel ?? node.riskLevel,
      riskReasons: input.riskReasons ?? node.riskReasons,
      linkedThreadIds: input.linkedThreadIds
        ? mergeUnique(node.linkedThreadIds, input.linkedThreadIds)
        : node.linkedThreadIds,
      linkedWorktreePaths: input.linkedWorktreePaths
        ? mergeUnique(node.linkedWorktreePaths, input.linkedWorktreePaths)
        : node.linkedWorktreePaths,
      lastUpdatedAt: now,
    };

    this.nodes.set(nodeId, nextNode);

    const events: CanvasEvent[] = [];

    if (input.status && input.status !== previousStatus) {
      events.push({
        id: createEventId("node-status"),
        type: "node.status.updated",
        nodeId,
        status: input.status,
        timestamp: now,
      });
    }

    for (const filePath of nextFiles) {
      if (!previousFiles.has(filePath)) {
        events.push({
          id: createEventId("file-changed"),
          type: "file.changed",
          nodeId,
          threadId: nextNode.linkedThreadIds.at(-1),
          filePath,
          timestamp: now,
        });
      }
    }

    if (input.diffSummary) {
      events.push({
        id: createEventId("diff-attached"),
        type: "diff.attached",
        nodeId,
        changedFiles: nextFiles,
        diffSummary: input.diffSummary,
        timestamp: now,
      });
    }

    if (input.testStatus) {
      events.push({
        id: createEventId("test-updated"),
        type: "test.updated",
        nodeId,
        command: input.testCommand ?? nextNode.testCommand ?? "unknown",
        testStatus: input.testStatus,
        outputSummary: input.testOutputSummary,
        timestamp: now,
      });
    }

    this.recordEvents(events);

    return { node: nextNode, events };
  }

  createThread(input: CreateThreadInput) {
    const node = this.requireNode(input.nodeId);
    const now = new Date().toISOString();
    const threadId = uniqueId(
      toId("thread", input.title ?? node.title),
      (id) => this.threads.has(id),
    );

    const thread: CodexThread = {
      id: threadId,
      nodeId: input.nodeId,
      title: input.title ?? node.title,
      status: input.status ?? "running",
      worktreePath: input.worktreePath,
      branchName: input.branchName,
      originalPrompt: input.originalPrompt,
      messages: [],
      changedFiles: [],
      createdAt: now,
      updatedAt: now,
    };

    this.threads.set(thread.id, thread);

    const { node: updatedNode, events } = this.updateNode(input.nodeId, {
      status: "planning",
      linkedThreadIds: [thread.id],
      linkedWorktreePaths: input.worktreePath ? [input.worktreePath] : [],
    });

    const threadEvent: CanvasEvent = {
      id: createEventId("thread-started"),
      type: "thread.started",
      nodeId: input.nodeId,
      threadId: thread.id,
      timestamp: now,
    };

    this.recordEvent(threadEvent);

    return { thread, node: updatedNode, events: [...events, threadEvent] };
  }

  createMessage(input: CreateMessageInput) {
    const node = this.requireNode(input.nodeId);
    const now = new Date().toISOString();

    if (input.threadId && !this.threads.has(input.threadId)) {
      throw new NotFoundError(`Thread not found: ${input.threadId}`);
    }

    const message: CanvasMessage = {
      id: createMessageId(),
      nodeId: input.nodeId,
      threadId: input.threadId,
      role: input.role,
      content: input.content,
      createdAt: now,
    };

    this.messages.push(message);

    if (input.threadId) {
      const thread = this.threads.get(input.threadId);
      if (thread) {
        this.threads.set(thread.id, {
          ...thread,
          messages: [...thread.messages, message],
          updatedAt: now,
        });
      }
    }

    const event: CanvasEvent = {
      id: createEventId("message-created"),
      type: "message.created",
      nodeId: node.id,
      threadId: input.threadId,
      role: input.role,
      content: input.content,
      timestamp: now,
    };

    this.recordEvent(event);

    return { message, event };
  }

  attachDiff(nodeId: string, changedFiles: string[], diffSummary: string) {
    return this.updateNode(nodeId, {
      status: "editing",
      changedFiles,
      diffSummary,
    });
  }

  markTestResult(
    nodeId: string,
    command: string,
    testStatus: TestStatus,
    outputSummary?: string,
  ) {
    const status: FeatureStatus = testStatus === "running" ? "testing" : this.requireNode(nodeId).status;
    return this.updateNode(nodeId, {
      status,
      testStatus,
      testCommand: command,
      testOutputSummary: outputSummary,
    });
  }

  markConflict(nodeIds: string[], files: string[], reason: string) {
    const timestamp = new Date().toISOString();

    for (const nodeId of nodeIds) {
      const node = this.requireNode(nodeId);
      this.nodes.set(nodeId, {
        ...node,
        riskLevel: "high",
        riskReasons: mergeUnique(node.riskReasons, [reason]),
        lastUpdatedAt: timestamp,
      });
    }

    const event: CanvasEvent = {
      id: createEventId("conflict-detected"),
      type: "conflict.detected",
      nodeIds,
      files,
      reason,
      timestamp,
    };

    this.recordEvent(event);
    return { event, nodes: nodeIds.map((nodeId) => this.requireNode(nodeId)) };
  }

  getNodeContext(nodeId: string): NodeContext {
    const node = this.requireNode(nodeId);
    const recentMessages = this.messages
      .filter((message) => message.nodeId === nodeId)
      .slice(-MAX_RECENT_MESSAGES);

    return {
      nodeId: node.id,
      title: node.title,
      description: node.description,
      originalPrompt: node.originalPrompt,
      status: node.status,
      changedFiles: node.changedFiles,
      diffSummary: node.diffSummary,
      testStatus: node.testStatus,
      testCommand: node.testCommand,
      testOutputSummary: node.testOutputSummary,
      riskLevel: node.riskLevel,
      riskReasons: node.riskReasons,
      linkedThreadIds: node.linkedThreadIds,
      recentMessages,
    };
  }

  applyEvent(event: CanvasEvent) {
    this.recordEvent(event);
  }

  private requireNode(nodeId: string) {
    const node = this.nodes.get(nodeId);
    if (!node) {
      throw new NotFoundError(`Node not found: ${nodeId}`);
    }

    return node;
  }

  private recordEvent(event: CanvasEvent) {
    this.recordEvents([event]);
  }

  private recordEvents(events: CanvasEvent[]) {
    this.events = [...this.events, ...events].slice(-MAX_EVENTS);
  }
}

export class NotFoundError extends Error {}

export const store = new CanvasStore();

function mergeUnique(first: string[], second: string[]) {
  return Array.from(new Set([...first, ...second])).filter(Boolean);
}

function toId(prefix: string, value: string) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);

  return `${prefix}-${slug || "item"}`;
}

function uniqueId(baseId: string, exists: (id: string) => boolean) {
  if (!exists(baseId)) {
    return baseId;
  }

  let index = 2;
  while (exists(`${baseId}-${index}`)) {
    index += 1;
  }

  return `${baseId}-${index}`;
}

function createEventId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createMessageId() {
  return createEventId("message");
}
