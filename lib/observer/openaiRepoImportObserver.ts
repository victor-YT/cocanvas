import type { RepoArtifact } from "@/lib/repo/scanRepo";
import type {
  GraphEvent,
  ObservedEdgeRelation,
  ObservedNodeStatus,
  ObservedNodeType,
} from "@/lib/types/observedGraph";

type RepoImportObserverResult = {
  events: GraphEvent[];
  productAreaCount: number;
};

type ObserverResponseShape = {
  events?: unknown;
};

const nodeTypes: ObservedNodeType[] = ["feature"];

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

const repoImportInstructions = `
You are the cocanvas repository import observer.

Convert a current repository snapshot into a product feature hierarchy for
cocanvas. This is not a code dependency graph and not a file tree. It is a
feature-first map of what the product appears to do.

Rules:
- Return only valid JSON matching the schema.
- Output only feature hierarchy events: node.upsert and edge.upsert.
- Use nodeType "feature" for every visible canvas node.
- Do not create evidence, risk, file, command, or test nodes.
- Create 3-7 top-level product areas when the repo supports it.
- Create child features under those product areas.
- Prefer product language over code language.
- Do not make one generic "Features" root node.
- Do not put every service under one parent.
- Avoid titles ending in Service, Component, Handler, Module, Util, or Route.
- Keep each top-level product area to about 4-8 child features.
- Use only relatedFiles paths that exist in the provided artifact list.
- If uncertain, group small implementation details into a product-like utility area.
- Edges must be contains only: parent feature -> child feature.
`;

const graphEventSchema = {
  type: "object",
  additionalProperties: false,
  required: ["events"],
  properties: {
    events: {
      type: "array",
      maxItems: 80,
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
      node.nodeType === "feature" &&
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
      edge.relation === "contains" &&
      (edge.label === undefined || typeof edge.label === "string")
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

function normalizeEventIds(events: GraphEvent[]) {
  const seen = new Set<string>();

  return events.filter((event) => {
    if (event.type !== "node.upsert" && event.type !== "edge.upsert") {
      return false;
    }

    const id =
      event.type === "node.upsert" ? `node:${event.node.id}` : `edge:${event.edge.id}`;

    if (seen.has(id)) {
      return false;
    }

    seen.add(id);
    return true;
  });
}

function filterRelatedFiles(events: GraphEvent[], artifacts: RepoArtifact[]) {
  const validPaths = new Set(artifacts.map((artifact) => artifact.path));

  return events.map((event): GraphEvent => {
    if (event.type !== "node.upsert") {
      return event;
    }

    return {
      ...event,
      node: {
        ...event.node,
        relatedFiles: event.node.relatedFiles?.filter((file) =>
          validPaths.has(file),
        ),
      },
    };
  });
}

function countRootNodes(events: GraphEvent[]) {
  const nodeIds = new Set<string>();
  const childIds = new Set<string>();

  events.forEach((event) => {
    if (event.type === "node.upsert") {
      nodeIds.add(event.node.id);
      return;
    }

    if (event.type === "edge.upsert") {
      childIds.add(event.edge.to);
    }
  });

  return [...nodeIds].filter((id) => !childIds.has(id)).length;
}

export async function observeRepoImportWithOpenAI(
  repoPath: string,
  artifacts: RepoArtifact[],
): Promise<RepoImportObserverResult | undefined> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey || artifacts.length === 0) {
    return undefined;
  }

  const model =
    process.env.OPENAI_REPO_IMPORT_MODEL ||
    process.env.OPENAI_OBSERVER_MODEL ||
    "gpt-5.4";
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      instructions: repoImportInstructions,
      input: JSON.stringify({
        repoPath,
        artifacts: artifacts.map((artifact) => ({
          path: artifact.path,
          kind: artifact.kind,
          name: artifact.name,
          contentPreview: artifact.contentPreview,
        })),
      }),
      max_output_tokens: 7000,
      text: {
        format: {
          type: "json_schema",
          name: "cocanvas_repo_import_graph_events",
          schema: graphEventSchema,
          strict: false,
        },
      },
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`OpenAI repo import observer failed: ${response.status} ${detail}`);
  }

  const payload = (await response.json()) as unknown;
  const text = extractResponseText(payload);

  if (!text) {
    return undefined;
  }

  const events = normalizeEventIds(
    filterRelatedFiles(parseObserverEvents(text), artifacts),
  );

  if (events.length === 0) {
    return undefined;
  }

  return {
    events,
    productAreaCount: countRootNodes(events),
  };
}
