import type { McpTool } from "./types";

type JsonRpcRequest = {
  jsonrpc: "2.0";
  id?: string | number;
  method: string;
  params?: unknown;
};

type ServerOptions = {
  name: string;
  version: string;
  tools: McpTool[];
};

export function createMcpServer(options: ServerOptions) {
  const toolsByName = new Map(options.tools.map((tool) => [tool.name, tool]));
  let buffer: Buffer<ArrayBufferLike> = Buffer.alloc(0);

  function start() {
    process.stdin.on("data", (chunk: Buffer) => {
      buffer = Buffer.concat([buffer, chunk]);
      drainMessages();
    });

    process.stdin.on("error", (error) => {
      process.stderr.write(`${error.message}\n`);
    });
  }

  function drainMessages() {
    while (true) {
      const parsed = readMessage(buffer);
      if (!parsed) {
        return;
      }

      buffer = parsed.remaining;
      void handleMessage(parsed.message);
    }
  }

  async function handleMessage(request: JsonRpcRequest) {
    if (request.id === undefined) {
      return;
    }

    try {
      if (request.method === "initialize") {
        writeResult(request.id, {
          protocolVersion: "2024-11-05",
          capabilities: {
            tools: {},
          },
          serverInfo: {
            name: options.name,
            version: options.version,
          },
        });
        return;
      }

      if (request.method === "tools/list") {
        writeResult(request.id, {
          tools: options.tools.map((tool) => ({
            name: tool.name,
            description: tool.description,
            inputSchema: tool.inputSchema,
          })),
        });
        return;
      }

      if (request.method === "tools/call") {
        const params = readObject(request.params);
        const toolName = readString(params.name, "Tool call is missing params.name");
        const tool = toolsByName.get(toolName);

        if (!tool) {
          throw new Error(`Unknown tool: ${toolName}`);
        }

        const result = await tool.handler(params.arguments ?? {});
        writeResult(request.id, {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
          structuredContent: result,
        });
        return;
      }

      writeError(request.id, -32601, `Unsupported method: ${request.method}`);
    } catch (error) {
      writeError(
        request.id,
        -32000,
        error instanceof Error ? error.message : "Unknown MCP server error",
      );
    }
  }

  return { start };
}

function readMessage(buffer: Buffer) {
  const headerEnd = buffer.indexOf("\r\n\r\n");
  if (headerEnd === -1) {
    return undefined;
  }

  const header = buffer.subarray(0, headerEnd).toString("utf8");
  const match = /^Content-Length:\s*(\d+)$/im.exec(header);
  if (!match) {
    throw new Error("MCP message is missing Content-Length header");
  }

  const length = Number(match[1]);
  const bodyStart = headerEnd + 4;
  const bodyEnd = bodyStart + length;

  if (buffer.length < bodyEnd) {
    return undefined;
  }

  return {
    message: JSON.parse(buffer.subarray(bodyStart, bodyEnd).toString("utf8")) as JsonRpcRequest,
    remaining: buffer.subarray(bodyEnd),
  };
}

function writeResult(id: JsonRpcRequest["id"], result: unknown) {
  writeMessage({ jsonrpc: "2.0", id, result });
}

function writeError(id: JsonRpcRequest["id"], code: number, message: string) {
  writeMessage({
    jsonrpc: "2.0",
    id,
    error: {
      code,
      message,
    },
  });
}

function writeMessage(message: unknown) {
  const body = JSON.stringify(message);
  process.stdout.write(`Content-Length: ${Buffer.byteLength(body, "utf8")}\r\n\r\n${body}`);
}

function readObject(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Expected an object");
  }

  return value as Record<string, unknown>;
}

function readString(value: unknown, message: string) {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(message);
  }

  return value;
}
