import type {
  GraphEvent,
  ObservedEdgeRelation,
  ObservedNodeStatus,
  ObservedNodeType,
} from "@/lib/types/observedGraph";

type OpenAIObserverInput = {
  repoPath: string;
  prompt: string;
  runId: string;
  assistantText: string;
  rawEvents: unknown[];
  adapterGraphEvents: GraphEvent[];
};

type ObserverResponseShape = {
  events?: unknown;
};

const nodeTypes: ObservedNodeType[] = [
  "feature",
  "flow",
  "capability",
  "cluster",
];

const nodeStatuses: ObservedNodeStatus[] = [
  "planned",
  "building",
  "implemented",
  "needs_evidence",
  "verified",
  "risk",
  "unlinked",
];

const edgeRelations: ObservedEdgeRelation[] = ["contains"];

const observerInstructions = `
You are the cocanvas observer.

Convert a completed Codex run into append-only cocanvas GraphEvent JSON.

cocanvas draws a Feature Map: what product features Codex actually built, not
what the user hoped it would build. The user prompt is context, but visible
feature nodes must come from observed Codex actions, files, diffs, tests, and
messages.

Rules:
- Return only valid JSON matching the schema.
- Model every visible product thing as a feature in the canvas.
- Use node.upsert with nodeType feature, flow, capability, or cluster only.
- Do not create node.upsert events with nodeType evidence or risk.
- Use contains edges for parent feature -> child feature only.
- Do not output supports, blocks, enables, or related edges for the main canvas.
- Add evidence.add for observed files, diffs, plans, commands, or passing tests.
- Add risk.add for failed commands, missing verification, scope drift, or unclear implementation.
- Use status.update to mark verified or risk when evidence supports it.
- Keep node ids stable, lowercase, snake_case, and product-readable.
- Do not invent files, test results, or implementation details that are not in the input.
`;

const graphEventSchema = {
  type: "object",
  additionalProperties: false,
  required: ["events"],
  properties: {
    events: {
      type: "array",
      maxItems: 60,
      items: {
        anyOf: [
          {
            type: "object",
            additionalProperties: false,
            required: ["type", "node"],
            properties: {
              type: { type: "string", enum: ["node.upsert"] },
              node: {
                type: "object",
                additionalProperties: false,
                required: ["id", "nodeType", "title"],
                properties: {
                  id: { type: "string" },
                  nodeType: { type: "string", enum: nodeTypes },
                  title: { type: "string" },
                  status: { type: "string", enum: nodeStatuses },
                  summary: { type: "string" },
                  confidence: { type: "number" },
                  relatedFiles: {
                    type: "array",
                    items: { type: "string" },
                  },
                },
              },
            },
          },
          {
            type: "object",
            additionalProperties: false,
            required: ["type", "edge"],
            properties: {
              type: { type: "string", enum: ["edge.upsert"] },
              edge: {
                type: "object",
                additionalProperties: false,
                required: ["id", "from", "to", "relation"],
                properties: {
                  id: { type: "string" },
                  from: { type: "string" },
                  to: { type: "string" },
                  relation: { type: "string", enum: edgeRelations },
                  label: { type: "string" },
                },
              },
            },
          },
          {
            type: "object",
            additionalProperties: false,
            required: ["type", "targetId", "status"],
            properties: {
              type: { type: "string", enum: ["status.update"] },
              targetId: { type: "string" },
              status: { type: "string", enum: nodeStatuses },
              summary: { type: "string" },
            },
          },
          {
            type: "object",
            additionalProperties: false,
            required: ["type", "targetId", "evidence"],
            properties: {
              type: { type: "string", enum: ["evidence.add"] },
              targetId: { type: "string" },
              evidence: {
                type: "object",
                additionalProperties: false,
                required: ["id", "kind", "summary"],
                properties: {
                  id: { type: "string" },
                  kind: {
                    type: "string",
                    enum: ["test", "diff", "file", "command", "plan", "inference"],
                  },
                  summary: { type: "string" },
                  path: { type: "string" },
                },
              },
            },
          },
          {
            type: "object",
            additionalProperties: false,
            required: ["type", "targetId", "risk"],
            properties: {
              type: { type: "string", enum: ["risk.add"] },
              targetId: { type: "string" },
              risk: {
                type: "object",
                additionalProperties: false,
                required: ["id", "severity", "summary"],
                properties: {
                  id: { type: "string" },
                  severity: { type: "string", enum: ["low", "medium", "high"] },
                  summary: { type: "string" },
                  path: { type: "string" },
                },
              },
            },
          },
        ],
      },
    },
  },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isGraphEvent(value: unknown): value is GraphEvent {
  if (!isRecord(value) || typeof value.type !== "string") {
    return false;
  }

  if (value.type === "node.upsert") {
    const node = value.node;

    return (
      isRecord(node) &&
      typeof node.id === "string" &&
      nodeTypes.includes(node.nodeType as ObservedNodeType) &&
      typeof node.title === "string" &&
      (node.status === undefined ||
        nodeStatuses.includes(node.status as ObservedNodeStatus)) &&
      (node.summary === undefined || typeof node.summary === "string") &&
      (node.confidence === undefined || typeof node.confidence === "number") &&
      (node.relatedFiles === undefined || isStringArray(node.relatedFiles))
    );
  }

  if (value.type === "edge.upsert") {
    const edge = value.edge;

    return (
      isRecord(edge) &&
      typeof edge.id === "string" &&
      typeof edge.from === "string" &&
      typeof edge.to === "string" &&
      edgeRelations.includes(edge.relation as ObservedEdgeRelation) &&
      (edge.label === undefined || typeof edge.label === "string")
    );
  }

  if (value.type === "status.update") {
    return (
      typeof value.targetId === "string" &&
      nodeStatuses.includes(value.status as ObservedNodeStatus) &&
      (value.summary === undefined || typeof value.summary === "string")
    );
  }

  if (value.type === "evidence.add") {
    const evidence = value.evidence;

    return (
      typeof value.targetId === "string" &&
      isRecord(evidence) &&
      typeof evidence.id === "string" &&
      ["test", "diff", "file", "command", "plan", "inference"].includes(
        String(evidence.kind),
      ) &&
      typeof evidence.summary === "string" &&
      (evidence.path === undefined || typeof evidence.path === "string")
    );
  }

  if (value.type === "risk.add") {
    const risk = value.risk;

    return (
      typeof value.targetId === "string" &&
      isRecord(risk) &&
      typeof risk.id === "string" &&
      ["low", "medium", "high"].includes(String(risk.severity)) &&
      typeof risk.summary === "string" &&
      (risk.path === undefined || typeof risk.path === "string")
    );
  }

  return false;
}

function extractResponseText(payload: unknown) {
  if (!isRecord(payload)) {
    return "";
  }

  if (typeof payload.output_text === "string") {
    return payload.output_text;
  }

  const output = payload.output;

  if (!Array.isArray(output)) {
    return "";
  }

  return output
    .flatMap((item) => {
      if (!isRecord(item) || !Array.isArray(item.content)) {
        return [];
      }

      return item.content
        .map((content) => {
          if (!isRecord(content)) {
            return "";
          }

          if (typeof content.text === "string") {
            return content.text;
          }

          if (typeof content.output_text === "string") {
            return content.output_text;
          }

          return "";
        })
        .filter(Boolean);
    })
    .join("");
}

function parseObserverEvents(text: string) {
  const parsed = JSON.parse(text) as ObserverResponseShape;
  const events = Array.isArray(parsed.events) ? parsed.events : [];

  return events.filter(isGraphEvent);
}

export async function observeCodexRunWithOpenAI(
  input: OpenAIObserverInput,
): Promise<GraphEvent[]> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return [];
  }

  const model = process.env.OPENAI_OBSERVER_MODEL || "gpt-5.4";
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      instructions: observerInstructions,
      input: JSON.stringify({
        repoPath: input.repoPath,
        prompt: input.prompt,
        runId: input.runId,
        assistantText: input.assistantText,
        rawEvents: input.rawEvents.slice(-80),
        adapterGraphEvents: input.adapterGraphEvents,
      }),
      max_output_tokens: 4000,
      text: {
        format: {
          type: "json_schema",
          name: "cocanvas_graph_events",
          schema: graphEventSchema,
          strict: false,
        },
      },
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`OpenAI observer failed: ${response.status} ${detail}`);
  }

  const payload = (await response.json()) as unknown;
  const text = extractResponseText(payload);

  if (!text) {
    return [];
  }

  return parseObserverEvents(text);
}
