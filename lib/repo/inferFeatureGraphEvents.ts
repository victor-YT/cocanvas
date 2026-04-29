import type { GraphEvent, ObservedNodeStatus } from "@/lib/types/observedGraph";
import type { RepoArtifact, RepoArtifactKind } from "@/lib/repo/scanRepo";

type ProductAreaDefinition = {
  id: string;
  title: string;
  summary: string;
  keywords: string[];
};

type FeatureGroup = {
  definition: ProductAreaDefinition;
  files: Set<string>;
  children: Map<string, FeatureChild>;
};

type FeatureChild = {
  id: string;
  title: string;
  summary: string;
  files: Set<string>;
  priority: number;
};

export type InferredFeatureGraph = {
  events: GraphEvent[];
  productAreaCount: number;
};

const maxChildrenPerGroup = 50;

const productAreas: ProductAreaDefinition[] = [
  {
    id: "chat_conversation",
    title: "Chat / Conversation",
    summary: "Conversation, message, turn, and prompt flows inferred from the repository.",
    keywords: [
      "chat",
      "conversation",
      "message",
      "turn",
      "snapshot",
      "segment",
      "prompt",
      "composer",
      "thread",
    ],
  },
  {
    id: "assets_files",
    title: "Assets",
    summary: "File, media, attachment, and asset handling inferred from the repository.",
    keywords: [
      "asset",
      "assets",
      "file",
      "files",
      "drop",
      "attachment",
      "attachments",
      "visual",
      "preview",
      "media",
      "upload",
      "ingest",
      "image",
    ],
  },
  {
    id: "providers_models",
    title: "Providers / Models",
    summary: "Model, provider, LLM, and external fetch behavior inferred from the repository.",
    keywords: [
      "provider",
      "providers",
      "model",
      "models",
      "openai",
      "gemini",
      "anthropic",
      "llm",
      "codex",
      "web fetch",
      "webfetch",
      "fetch provider",
    ],
  },
  {
    id: "ui_theme",
    title: "UI / Theme",
    summary: "Interface, layout, theme, and interaction surfaces inferred from the repository.",
    keywords: [
      "ui",
      "theme",
      "menu",
      "style",
      "styles",
      "layout",
      "page",
      "panel",
      "canvas",
      "sidebar",
      "button",
      "modal",
      "store",
      "view",
      "screen",
    ],
  },
  {
    id: "data_backend",
    title: "Data / Backend",
    summary: "API, persistence, server, and data behavior inferred from the repository.",
    keywords: [
      "api",
      "route",
      "server",
      "database",
      "db",
      "prisma",
      "schema",
      "storage",
      "persist",
      "repository",
      "auth",
      "login",
      "user",
      "billing",
      "payment",
      "webhook",
    ],
  },
  {
    id: "utilities_error_handling",
    title: "Utilities / Error Handling",
    summary: "Utility, parser, error, and shared support behavior inferred from the repository.",
    keywords: [
      "error",
      "errors",
      "utils",
      "utility",
      "helper",
      "parse",
      "parser",
      "normalize",
      "format",
      "validator",
      "types",
      "config",
      "options",
      "constants",
    ],
  },
];

const fallbackArea = productAreas.at(-1) ?? productAreas[0];

const acronymByWord: Record<string, string> = {
  api: "API",
  db: "DB",
  id: "ID",
  llm: "LLM",
  ui: "UI",
  url: "URL",
};

const titleReplacements: Array<[RegExp, string]> = [
  [/^Use File Drop$/i, "File Drop"],
  [/^Asset Visual$/i, "Asset Preview"],
  [/^Edit Draft Attachments$/i, "Draft Attachments"],
  [/^Ingest Assets For Turn$/i, "Asset Ingestion"],
  [/^Apply Conversation Snapshot$/i, "Conversation Snapshot"],
  [/^Row To Turn$/i, "Turn Mapping"],
  [/^Use Memory Cloud$/i, "Memory Cloud"],
  [/^Provider Icon Map$/i, "Provider Icons"],
  [/^Provider Selection$/i, "Provider Selection"],
  [/^Model Defaults$/i, "Model Defaults"],
  [/^Web Fetch Providers$/i, "Web Fetch Providers"],
  [/^Error Message Utils$/i, "Error Messages"],
  [/^Select Menu Styles$/i, "Select Menu"],
  [/^Ui Store$/i, "UI State"],
  [/^Theme Store$/i, "Theme State"],
];

function safeId(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 96);
}

function titleCase(value: string) {
  const words = value
    .replace(/\.[^.]+$/, "")
    .replace(/\[[^\]]+\]/g, "detail")
    .replace(/[-_./]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) {
    return "Main";
  }

  return words
    .map((word) => {
      const lower = word.toLowerCase();

      return acronymByWord[lower] ?? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

function normalizeSearchText(value: string) {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .toLowerCase();
}

function searchableArtifactText(artifact: RepoArtifact) {
  return normalizeSearchText(`${artifact.path} ${artifact.name}`);
}

function searchablePreviewText(artifact: RepoArtifact) {
  return normalizeSearchText(artifact.contentPreview);
}

function areaScore(artifact: RepoArtifact, area: ProductAreaDefinition) {
  const pathAndName = searchableArtifactText(artifact);
  const preview = searchablePreviewText(artifact);
  let score = 0;

  area.keywords.forEach((keyword) => {
    const normalized = normalizeSearchText(keyword).trim();

    if (!normalized) {
      return;
    }

    if (pathAndName.includes(normalized)) {
      score += 5;
    }

    if (preview.includes(normalized)) {
      score += 1;
    }
  });

  if (artifact.kind === "page" || artifact.kind === "layout" || artifact.kind === "component") {
    score += area.id === "ui_theme" ? 2 : 0;
  }

  if (artifact.kind === "api" || artifact.kind === "database") {
    score += area.id === "data_backend" ? 3 : 0;
  }

  if (artifact.kind === "config" || artifact.kind === "style") {
    score += area.id === "ui_theme" || area.id === "utilities_error_handling" ? 1 : 0;
  }

  return score;
}

function productAreaForArtifact(artifact: RepoArtifact) {
  const ranked = productAreas
    .map((area) => ({
      area,
      score: areaScore(artifact, area),
    }))
    .sort((a, b) => b.score - a.score);

  const best = ranked[0];

  return best && best.score > 0 ? best.area : fallbackArea;
}

function cleanProductTitle(value: string) {
  let title = titleCase(value)
    .replace(/\b(Service|Component|Route|Handler|Module|Util|Utils|Helper|Helpers)\b$/i, "")
    .replace(/\b(API Route|Api Route)\b$/i, "API")
    .replace(/^Use\s+/i, "")
    .replace(/\s+/g, " ")
    .trim();

  titleReplacements.forEach(([pattern, replacement]) => {
    title = title.replace(pattern, replacement);
  });

  return title || "Imported Feature";
}

function routeSegments(path: string, prefix: string) {
  return path
    .replace(prefix, "")
    .replace(/\/(page|layout|route)\.tsx?$/, "")
    .replace(/^(page|layout|route)\.tsx?$/, "")
    .split("/")
    .filter((segment) => segment && !segment.startsWith("(") && !segment.startsWith("@"));
}

function childTitleForArtifact(artifact: RepoArtifact) {
  if (artifact.kind === "database") {
    return "Database Schema";
  }

  if (artifact.kind === "page") {
    const segments = routeSegments(artifact.path, "app/");
    return segments.length === 0 ? "Main Page" : `${titleCase(segments.join(" "))} Page`;
  }

  if (artifact.kind === "layout") {
    const segments = routeSegments(artifact.path, "app/");
    return segments.length === 0 ? "Application Layout" : `${titleCase(segments.join(" "))} Layout`;
  }

  if (artifact.kind === "api") {
    const segments = routeSegments(artifact.path, "app/api/");
    return `${titleCase(segments.join(" "))} API`;
  }

  return cleanProductTitle(artifact.name);
}

function summaryForKind(kind: RepoArtifactKind) {
  const summaries: Record<RepoArtifactKind, string> = {
    page: "Imported from a Next.js page file.",
    layout: "Imported from a Next.js layout file.",
    api: "Imported from a Next.js route handler.",
    app: "Imported from an app source file.",
    component: "Imported from a React component.",
    service: "Imported from a TypeScript service module.",
    database: "Imported from the Prisma schema.",
    test: "Imported from test files and attached as related context.",
    style: "Imported from a stylesheet.",
    config: "Imported from project configuration.",
  };

  return summaries[kind];
}

function priorityForArtifact(artifact: RepoArtifact) {
  const priorityByKind: Record<RepoArtifactKind, number> = {
    page: 100,
    database: 92,
    api: 88,
    app: 82,
    layout: 76,
    component: 68,
    service: 62,
    style: 40,
    config: 20,
    test: 0,
  };

  return priorityByKind[artifact.kind];
}

function statusForGroup(group: FeatureGroup): ObservedNodeStatus {
  return group.files.size > 0 ? "implemented" : "planned";
}

function getGroup(groups: Map<string, FeatureGroup>, definition: ProductAreaDefinition) {
  const existing = groups.get(definition.id);

  if (existing) {
    return existing;
  }

  const group: FeatureGroup = {
    definition,
    files: new Set(),
    children: new Map(),
  };

  groups.set(definition.id, group);
  return group;
}

function addChild(group: FeatureGroup, artifact: RepoArtifact) {
  const title = childTitleForArtifact(artifact);
  const id = `import_${group.definition.id}_${safeId(title)}`;
  const existing = group.children.get(id);

  if (existing) {
    existing.files.add(artifact.path);
    existing.priority = Math.max(existing.priority, priorityForArtifact(artifact));
    return;
  }

  group.children.set(id, {
    id,
    title,
    summary: summaryForKind(artifact.kind),
    files: new Set([artifact.path]),
    priority: priorityForArtifact(artifact),
  });
}

function visibleChildren(group: FeatureGroup) {
  const children = [...group.children.values()].sort((a, b) => {
    if (b.priority !== a.priority) {
      return b.priority - a.priority;
    }

    return a.title.localeCompare(b.title);
  });

  if (children.length <= maxChildrenPerGroup) {
    return children;
  }

  const visible = children.slice(0, maxChildrenPerGroup - 1);
  const overflow = children.slice(maxChildrenPerGroup - 1);

  visible.push({
    id: `import_${group.definition.id}_more_utilities`,
    title: "More Utilities",
    summary: `${overflow.length} additional imported modules are grouped here.`,
    files: new Set(overflow.flatMap((child) => [...child.files])),
    priority: 1,
  });

  return visible;
}

function groupEvents(group: FeatureGroup): GraphEvent[] {
  const groupId = `import_${group.definition.id}`;
  const children = visibleChildren(group);
  const groupEvent: GraphEvent = {
    type: "node.upsert",
    node: {
      id: groupId,
      nodeType: "feature",
      title: group.definition.title,
      status: statusForGroup(group),
      summary: group.definition.summary,
      confidence: 0.74,
      relatedFiles: [...group.files],
    },
  };
  const childEvents = children.flatMap((child): GraphEvent[] => [
    {
      type: "node.upsert",
      node: {
        id: child.id,
        nodeType: "feature",
        title: child.title,
        status: "implemented",
        summary: child.summary,
        confidence: 0.7,
        relatedFiles: [...child.files],
      },
    },
    {
      type: "edge.upsert",
      edge: {
        id: `${groupId}_contains_${child.id}`,
        from: groupId,
        to: child.id,
        relation: "contains",
      },
    },
  ]);

  return [groupEvent, ...childEvents];
}

export function inferFeatureGraphFromArtifacts(
  artifacts: RepoArtifact[],
): InferredFeatureGraph {
  const groups = new Map<string, FeatureGroup>();

  artifacts.forEach((artifact) => {
    const area = productAreaForArtifact(artifact);
    const group = getGroup(groups, area);
    group.files.add(artifact.path);

    if (artifact.kind !== "test") {
      addChild(group, artifact);
    }
  });

  const nonEmptyGroups = [...groups.values()]
    .filter((group) => group.children.size > 0)
    .sort((a, b) => productAreas.indexOf(a.definition) - productAreas.indexOf(b.definition));

  return {
    events: nonEmptyGroups.flatMap(groupEvents),
    productAreaCount: nonEmptyGroups.length,
  };
}

export function inferFeatureGraphEventsFromArtifacts(
  artifacts: RepoArtifact[],
): GraphEvent[] {
  return inferFeatureGraphFromArtifacts(artifacts).events;
}
