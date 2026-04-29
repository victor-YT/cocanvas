import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { URL } from "node:url";
import { eventBus } from "./events.ts";
import { buildNodeScopedPrompt, summarizeGraph } from "./graph.ts";
import { NotFoundError, store } from "./store.ts";
import type { CanvasEvent, FeatureStatus, MessageRole, RiskLevel, TestStatus } from "./types.ts";

const DEFAULT_PORT = 4000;
const PORT = Number(process.env.PORT ?? DEFAULT_PORT);
const HOST = process.env.HOST ?? "127.0.0.1";

type RouteParams = Record<string, string>;
type JsonValue = Record<string, unknown>;
type Handler = (
  request: IncomingMessage,
  response: ServerResponse,
  params: RouteParams,
) => Promise<void> | void;

type Route = {
  method: string;
  pattern: RegExp;
  keys: string[];
  handler: Handler;
};

const routes: Route[] = [
  route("GET", "/api/health", async (_request, response) => {
    sendJson(response, {
      ok: true,
      service: "codex-live-canvas-backend",
      timestamp: new Date().toISOString(),
    });
  }),

  route("GET", "/api/graph", async (_request, response) => {
    const snapshot = store.snapshot();
    sendJson(response, {
      ...snapshot,
      summary: summarizeGraph(snapshot),
    });
  }),

  route("POST", "/api/nodes", async (request, response) => {
    const body = await readJson(request);
    const title = requireString(body, "title");

    const result = store.createNode({
      title,
      description: optionalString(body, "description"),
      originalPrompt: optionalString(body, "originalPrompt"),
      threadId: optionalString(body, "threadId"),
      worktreePath: optionalString(body, "worktreePath"),
    });

    publishAll(result.events);
    sendJson(response, { ...result, nodeId: result.node.id }, 201);
  }),

  route("PATCH", "/api/nodes/:id", async (request, response, params) => {
    const body = await readJson(request);
    const result = store.updateNode(params.id, {
      status: optionalEnum(body, "status", featureStatuses),
      summary: optionalString(body, "summary"),
      changedFiles: optionalStringArray(body, "changedFiles"),
      diffSummary: optionalString(body, "diffSummary"),
      testStatus: optionalEnum(body, "testStatus", testStatuses),
      testCommand: optionalString(body, "testCommand"),
      testOutputSummary: optionalString(body, "testOutputSummary"),
      riskLevel: optionalEnum(body, "riskLevel", riskLevels),
      riskReasons: optionalStringArray(body, "riskReasons"),
      linkedThreadIds: optionalStringArray(body, "linkedThreadIds"),
      linkedWorktreePaths: optionalStringArray(body, "linkedWorktreePaths"),
    });

    publishAll(result.events);
    sendJson(response, result);
  }),

  route("POST", "/api/nodes/:id/diff", async (request, response, params) => {
    const body = await readJson(request);
    const changedFiles = requireStringArray(body, "changedFiles");
    const diffSummary = requireString(body, "diffSummary");
    const result = store.attachDiff(params.id, changedFiles, diffSummary);

    publishAll(result.events);
    sendJson(response, result);
  }),

  route("POST", "/api/nodes/:id/tests", async (request, response, params) => {
    const body = await readJson(request);
    const command = requireString(body, "command");
    const status = requireEnum(body, "status", testStatuses);
    const result = store.markTestResult(
      params.id,
      command,
      status,
      optionalString(body, "outputSummary"),
    );

    publishAll(result.events);
    sendJson(response, result);
  }),

  route("GET", "/api/nodes/:id/context", async (_request, response, params) => {
    sendJson(response, store.getNodeContext(params.id));
  }),

  route("POST", "/api/nodes/:id/chat", async (request, response, params) => {
    const body = await readJson(request);
    const content = requireString(body, "content");
    const threadId = optionalString(body, "threadId");
    const role = optionalEnum(body, "role", messageRoles) ?? "user";
    const messageResult = store.createMessage({
      nodeId: params.id,
      threadId,
      role,
      content,
    });
    const context = store.getNodeContext(params.id);

    eventBus.publish(messageResult.event);
    sendJson(response, {
      ...messageResult,
      context,
      nodeScopedPrompt: buildNodeScopedPrompt(context, content),
    });
  }),

  route("POST", "/api/threads", async (request, response) => {
    const body = await readJson(request);
    const result = store.createThread({
      nodeId: requireString(body, "nodeId"),
      title: optionalString(body, "title"),
      originalPrompt: requireString(body, "originalPrompt"),
      worktreePath: optionalString(body, "worktreePath"),
      branchName: optionalString(body, "branchName"),
      status: optionalEnum(body, "status", threadStatuses),
    });

    publishAll(result.events);
    sendJson(response, result, 201);
  }),

  route("POST", "/api/conflicts", async (request, response) => {
    const body = await readJson(request);
    const result = store.markConflict(
      requireStringArray(body, "nodeIds"),
      requireStringArray(body, "files"),
      requireString(body, "reason"),
    );

    eventBus.publish(result.event);
    sendJson(response, result, 201);
  }),

  route("POST", "/api/events", async (request, response) => {
    const event = (await readJson(request)) as CanvasEvent;
    store.applyEvent(event);
    eventBus.publish(event);
    sendJson(response, { ok: true, event }, 202);
  }),

  route("GET", "/api/events/stream", async (request, response) => {
    response.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
    });
    response.write(`event: ready\ndata: ${JSON.stringify({ ok: true })}\n\n`);

    const unsubscribe = eventBus.subscribe((event) => {
      response.write(`data: ${JSON.stringify(event)}\n\n`);
    });

    request.on("close", unsubscribe);
  }),
];

const server = createServer(async (request, response) => {
  setCorsHeaders(response);

  if (request.method === "OPTIONS") {
    response.writeHead(204);
    response.end();
    return;
  }

  try {
    const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
    const matchingRoute = matchRoute(request.method ?? "GET", url.pathname);

    if (!matchingRoute) {
      sendJson(response, { error: "Not found" }, 404);
      return;
    }

    await matchingRoute.route.handler(request, response, matchingRoute.params);
  } catch (error) {
    if (error instanceof NotFoundError) {
      sendJson(response, { error: error.message }, 404);
      return;
    }

    if (error instanceof BadRequestError) {
      sendJson(response, { error: error.message }, 400);
      return;
    }

    console.error(error);
    sendJson(response, { error: "Internal server error" }, 500);
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Codex Live Canvas backend listening on http://${HOST}:${PORT}`);
});

function route(method: string, path: string, handler: Handler): Route {
  const keys: string[] = [];
  const pattern = new RegExp(
    `^${path
      .split("/")
      .map((part) => {
        if (part.startsWith(":")) {
          keys.push(part.slice(1));
          return "([^/]+)";
        }

        return part;
      })
      .join("/")}$`,
  );

  return { method, pattern, keys, handler };
}

function matchRoute(method: string, pathname: string) {
  for (const candidate of routes) {
    if (candidate.method !== method) {
      continue;
    }

    const match = candidate.pattern.exec(pathname);
    if (!match) {
      continue;
    }

    const params = Object.fromEntries(
      candidate.keys.map((key, index) => [key, decodeURIComponent(match[index + 1] ?? "")]),
    );

    return { route: candidate, params };
  }

  return undefined;
}

async function readJson(request: IncomingMessage): Promise<JsonValue> {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  if (chunks.length === 0) {
    return {};
  }

  try {
    const parsed: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new BadRequestError("Expected a JSON object body");
    }

    return parsed as JsonValue;
  } catch (error) {
    if (error instanceof BadRequestError) {
      throw error;
    }

    throw new BadRequestError("Invalid JSON body");
  }
}

function sendJson(response: ServerResponse, value: unknown, status = 200) {
  if (response.headersSent) {
    return;
  }

  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(value, null, 2));
}

function setCorsHeaders(response: ServerResponse) {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function publishAll(events: CanvasEvent[]) {
  for (const event of events) {
    eventBus.publish(event);
  }
}

function requireString(body: JsonValue, key: string) {
  const value = body[key];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new BadRequestError(`Expected non-empty string: ${key}`);
  }

  return value;
}

function optionalString(body: JsonValue, key: string) {
  const value = body[key];
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new BadRequestError(`Expected string: ${key}`);
  }

  return value;
}

function requireStringArray(body: JsonValue, key: string) {
  const value = optionalStringArray(body, key);
  if (!value) {
    throw new BadRequestError(`Expected string array: ${key}`);
  }

  return value;
}

function optionalStringArray(body: JsonValue, key: string) {
  const value = body[key];
  if (value === undefined) {
    return undefined;
  }

  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new BadRequestError(`Expected string array: ${key}`);
  }

  return value as string[];
}

function requireEnum<const TValue extends string>(
  body: JsonValue,
  key: string,
  allowed: readonly TValue[],
) {
  const value = optionalEnum(body, key, allowed);
  if (!value) {
    throw new BadRequestError(`Expected ${key} to be one of: ${allowed.join(", ")}`);
  }

  return value;
}

function optionalEnum<const TValue extends string>(
  body: JsonValue,
  key: string,
  allowed: readonly TValue[],
) {
  const value = body[key];
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string" || !allowed.includes(value as TValue)) {
    throw new BadRequestError(`Expected ${key} to be one of: ${allowed.join(", ")}`);
  }

  return value as TValue;
}

class BadRequestError extends Error {}

const featureStatuses = [
  "idle",
  "planning",
  "editing",
  "testing",
  "blocked",
  "done",
  "failed",
] as const satisfies readonly FeatureStatus[];

const testStatuses = ["unknown", "running", "passed", "failed"] as const satisfies readonly TestStatus[];

const riskLevels = ["low", "medium", "high"] as const satisfies readonly RiskLevel[];

const messageRoles = ["user", "codex", "system"] as const satisfies readonly MessageRole[];

const threadStatuses = ["queued", "running", "waiting", "done", "failed"] as const;
