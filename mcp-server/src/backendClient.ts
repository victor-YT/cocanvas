import type {
  AttachDiffInput,
  BackendDelivery,
  CreateFeatureNodeInput,
  FeatureNodeContext,
  MarkConflictInput,
  MarkTestResultInput,
  UpdateFeatureNodeInput,
} from "./types";

const DEFAULT_API_URL = "http://localhost:4000";

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH";
  body?: unknown;
};

export class BackendClient {
  private readonly apiUrl: string;
  private readonly offline: boolean;
  private readonly offlineNodes = new Map<string, FeatureNodeContext>();
  private readonly offlineEvents: unknown[] = [];

  constructor(env: NodeJS.ProcessEnv = process.env) {
    this.apiUrl = (env.LIVE_CANVAS_API_URL ?? DEFAULT_API_URL).replace(/\/$/, "");
    this.offline = env.LIVE_CANVAS_OFFLINE === "1" || env.LIVE_CANVAS_OFFLINE === "true";
  }

  async createFeatureNode(input: CreateFeatureNodeInput) {
    const nodeId = input.nodeId ?? slugId(input.title);
    const payload = {
      ...input,
      nodeId,
      status: "planning",
      createdAt: new Date().toISOString(),
    };

    if (this.offline) {
      this.offlineNodes.set(nodeId, {
        nodeId,
        title: input.title,
        originalPrompt: input.originalPrompt,
        changedFiles: [],
        testStatus: "unknown",
        riskReasons: [],
        recentMessages: [],
      });
      this.offlineEvents.push({ type: "node.created", nodeId, title: input.title });
      return delivery({ nodeId }, "offline");
    }

    const response = await this.request<{ nodeId?: string; id?: string; node?: { id: string } }>("/api/nodes", {
      method: "POST",
      body: payload,
    });

    return delivery(
      { nodeId: response.nodeId ?? response.node?.id ?? response.id ?? nodeId },
      "backend",
    );
  }

  async updateFeatureNode(input: UpdateFeatureNodeInput) {
    const payload = {
      ...input,
      updatedAt: new Date().toISOString(),
    };

    if (this.offline) {
      const node = this.offlineNodes.get(input.nodeId);
      if (node) {
        node.changedFiles = unique([...(node.changedFiles ?? []), ...(input.changedFiles ?? [])]);
        node.riskReasons = input.riskReasons ?? node.riskReasons;
      }
      this.offlineEvents.push({ type: "node.status.updated", ...payload });
      return delivery({ nodeId: input.nodeId, updated: true }, "offline");
    }

    const response = await this.request(`/api/nodes/${encodeURIComponent(input.nodeId)}`, {
      method: "PATCH",
      body: payload,
    });

    return delivery(response, "backend");
  }

  async attachDiff(input: AttachDiffInput) {
    const event = {
      type: "diff.attached",
      nodeId: input.nodeId,
      changedFiles: unique(input.changedFiles),
      diffSummary: input.diffSummary,
      createdAt: new Date().toISOString(),
    };

    if (this.offline) {
      const node = this.offlineNodes.get(input.nodeId);
      if (node) {
        node.changedFiles = unique([...node.changedFiles, ...input.changedFiles]);
        node.diffSummary = input.diffSummary;
      }
      this.offlineEvents.push(event);
      return delivery({ nodeId: input.nodeId, event }, "offline");
    }

    const response = await this.request(`/api/nodes/${encodeURIComponent(input.nodeId)}/diff`, {
      method: "POST",
      body: {
        changedFiles: event.changedFiles,
        diffSummary: event.diffSummary,
      },
    });

    return delivery(response, "backend");
  }

  async markTestResult(input: MarkTestResultInput) {
    const event = {
      type: "test.updated",
      nodeId: input.nodeId,
      command: input.command,
      testStatus: input.status,
      outputSummary: input.outputSummary,
      createdAt: new Date().toISOString(),
    };

    if (this.offline) {
      const node = this.offlineNodes.get(input.nodeId);
      if (node) {
        node.testStatus = input.status;
      }
      this.offlineEvents.push(event);
      return delivery({ nodeId: input.nodeId, event }, "offline");
    }

    const response = await this.request(`/api/nodes/${encodeURIComponent(input.nodeId)}/tests`, {
      method: "POST",
      body: {
        command: event.command,
        status: input.status,
        outputSummary: event.outputSummary,
      },
    });

    return delivery(response, "backend");
  }

  async markConflict(input: MarkConflictInput) {
    const event = {
      type: "conflict.detected",
      nodeIds: unique(input.nodeIds),
      files: unique(input.files),
      reason: input.reason,
      createdAt: new Date().toISOString(),
    };

    if (this.offline) {
      for (const nodeId of input.nodeIds) {
        const node = this.offlineNodes.get(nodeId);
        if (node) {
          node.riskReasons = unique([...node.riskReasons, input.reason]);
        }
      }
      this.offlineEvents.push(event);
      return delivery({ event }, "offline");
    }

    const response = await this.request("/api/conflicts", {
      method: "POST",
      body: {
        nodeIds: event.nodeIds,
        files: event.files,
        reason: event.reason,
      },
    });

    return delivery(response, "backend");
  }

  async getNodeContext(nodeId: string) {
    if (this.offline) {
      const node = this.offlineNodes.get(nodeId);
      if (!node) {
        throw new Error(`No offline node context found for ${nodeId}`);
      }
      return delivery(node, "offline");
    }

    const response = await this.request<FeatureNodeContext>(
      `/api/nodes/${encodeURIComponent(nodeId)}/context`,
    );

    return delivery(response, "backend");
  }

  private async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const response = await fetch(`${this.apiUrl}${path}`, {
      method: options.method ?? "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(
        `Live Canvas backend ${options.method ?? "GET"} ${path} failed with ${response.status}: ${detail}`,
      );
    }

    if (response.status === 204) {
      return {} as T;
    }

    return (await response.json()) as T;
  }
}

function delivery<T>(data: T, mode: BackendDelivery["mode"]): BackendDelivery<T> {
  return { mode, data };
}

function slugId(title: string) {
  const slug = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);

  return `feature-${slug || crypto.randomUUID()}`;
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}
