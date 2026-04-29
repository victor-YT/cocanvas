import type { GraphEvent, ObservedNodeStatus } from "@/lib/types/observedGraph";
import type { RepoArtifact, RepoArtifactKind } from "@/lib/repo/scanRepo";

type FeatureGroup = {
  id: string;
  title: string;
  summary: string;
  files: Set<string>;
  children: Map<string, FeatureChild>;
};

type FeatureChild = {
  id: string;
  title: string;
  summary: string;
  files: Set<string>;
};

function safeId(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
}

function titleCase(value: string) {
  const words = value
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
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function routeArea(path: string, prefix: string) {
  const segments = path
    .replace(prefix, "")
    .replace(/\/(page|layout|route)\.tsx?$/, "")
    .replace(/^(page|layout|route)\.tsx?$/, "")
    .split("/")
    .filter((segment) => segment && !segment.startsWith("(") && !segment.startsWith("@"));

  return segments.length === 0 ? "Main Page" : titleCase(segments[0]);
}

function componentArea(path: string, name: string) {
  const parts = path.split("/");
  const directory = parts[1];

  if (directory && directory !== name) {
    return titleCase(directory);
  }

  return name.replace(/\b(Component|View|Card|Panel|Section)\b/g, "").trim() || name;
}

function serviceArea(path: string, name: string) {
  const parts = path.split("/");
  const directory = parts[1];

  return directory ? titleCase(directory) : name;
}

function areaTitleForArtifact(artifact: RepoArtifact) {
  if (artifact.kind === "database") {
    return "Database Persistence";
  }

  if (artifact.kind === "page" || artifact.kind === "layout") {
    return routeArea(artifact.path, "app/");
  }

  if (artifact.kind === "api") {
    return `${routeArea(artifact.path, "app/api/")} API`;
  }

  if (artifact.kind === "component") {
    return componentArea(artifact.path, artifact.name);
  }

  if (artifact.kind === "service") {
    return serviceArea(artifact.path, artifact.name);
  }

  return titleCase(artifact.name.replace(/\bTests\b/g, "").trim());
}

function childTitleForArtifact(artifact: RepoArtifact) {
  if (artifact.kind === "page") {
    return `${artifact.name} UI`;
  }

  if (artifact.kind === "layout") {
    return artifact.name;
  }

  if (artifact.kind === "api") {
    return `${artifact.name} Route`;
  }

  if (artifact.kind === "component") {
    return `${artifact.name} Component`;
  }

  if (artifact.kind === "service") {
    return `${artifact.name} Service`;
  }

  if (artifact.kind === "database") {
    return "Prisma Schema";
  }

  return artifact.name;
}

function summaryForKind(kind: RepoArtifactKind) {
  const summaries: Record<RepoArtifactKind, string> = {
    page: "Imported from a Next.js page file.",
    layout: "Imported from a Next.js layout file.",
    api: "Imported from a Next.js route handler.",
    component: "Imported from a React component.",
    service: "Imported from a TypeScript service module.",
    database: "Imported from the Prisma schema.",
    test: "Imported from test files and attached as related context.",
  };

  return summaries[kind];
}

function statusForGroup(group: FeatureGroup): ObservedNodeStatus {
  return group.files.size > 0 ? "implemented" : "planned";
}

function getGroup(groups: Map<string, FeatureGroup>, artifact: RepoArtifact) {
  const title = areaTitleForArtifact(artifact);
  const id = `import_${safeId(title)}`;
  const existing = groups.get(id);

  if (existing) {
    return existing;
  }

  const group: FeatureGroup = {
    id,
    title,
    summary: "Imported from the current repository snapshot.",
    files: new Set(),
    children: new Map(),
  };

  groups.set(id, group);
  return group;
}

function addChild(group: FeatureGroup, artifact: RepoArtifact) {
  const title = childTitleForArtifact(artifact);
  const id = `${group.id}_${safeId(title)}`;
  const existing = group.children.get(id);

  if (existing) {
    existing.files.add(artifact.path);
    return;
  }

  group.children.set(id, {
    id,
    title,
    summary: summaryForKind(artifact.kind),
    files: new Set([artifact.path]),
  });
}

export function inferFeatureGraphEventsFromArtifacts(
  artifacts: RepoArtifact[],
): GraphEvent[] {
  const groups = new Map<string, FeatureGroup>();

  artifacts.forEach((artifact) => {
    const group = getGroup(groups, artifact);
    group.files.add(artifact.path);

    if (artifact.kind !== "test") {
      addChild(group, artifact);
    }
  });

  return [...groups.values()].flatMap((group) => {
    const children = [...group.children.values()];
    const groupEvent: GraphEvent = {
      type: "node.upsert",
      node: {
        id: group.id,
        nodeType: "feature",
        title: group.title,
        status: statusForGroup(group),
        summary: group.summary,
        confidence: 0.72,
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
          id: `${group.id}_contains_${child.id}`,
          from: group.id,
          to: child.id,
          relation: "contains",
        },
      },
    ]);

    return [groupEvent, ...childEvents];
  });
}
