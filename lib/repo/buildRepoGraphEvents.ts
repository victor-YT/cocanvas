import type { ArtifactKind, ArtifactRef } from "@/lib/types/graph";
import type { ParsedPrd, ParsedPrdFeature } from "@/lib/types/prd";
import type { GraphEvent } from "@/lib/types/observedGraph";

type RepoFeatureDefinition = {
  id: string;
  title: string;
  parentId: string;
  summary: string;
  match: (artifact: ArtifactRef) => boolean;
};

type RepoParentFeatureDefinition = {
  id: string;
  title: string;
  summary: string;
};

const rootNodeId = "current_codebase";
const configFilePattern =
  /(^|\/)(package(-lock)?\.json|tsconfig\.json|next\.config\.ts|eslint\.config\.mjs|postcss\.config\.mjs)$/;

const parentFeatureDefinitions: RepoParentFeatureDefinition[] = [
  {
    id: "open_feature_canvas",
    title: "Open feature canvas",
    summary:
      "User can open the canvas and understand product work as feature nodes.",
  },
  {
    id: "sync_a_repository",
    title: "Sync a repository",
    summary:
      "User can select a codebase and turn it into a feature map.",
  },
  {
    id: "follow_codex_work",
    title: "Follow Codex work",
    summary:
      "User can see what Codex is doing and inspect the work as it changes.",
  },
  {
    id: "trust_the_feature_map",
    title: "Trust the feature map",
    summary:
      "User can see evidence, risks, tests, and supporting product context.",
  },
];

const featureDefinitions: RepoFeatureDefinition[] = [
  {
    id: "explore_feature_nodes",
    title: "Explore feature nodes",
    parentId: "open_feature_canvas",
    summary:
      "User can pan around the canvas and scan product features as connected cards.",
    match: (artifact) =>
      (artifact.path.startsWith("components/graph/") &&
        artifact.path !== "components/graph/FeatureCanvas.tsx") ||
      artifact.path.startsWith("components/layout/") ||
      artifact.path === "app/page.tsx" ||
      artifact.path === "app/layout.tsx",
  },
  {
    id: "open_node_details",
    title: "Open node details",
    parentId: "open_feature_canvas",
    summary:
      "User can click a feature and read its files, evidence, risks, and raw events.",
    match: (artifact) =>
      artifact.path.startsWith("components/inspector/") ||
      artifact.path.startsWith("components/graph/FeatureCanvas.tsx"),
  },
  {
    id: "refresh_feature_map",
    title: "Refresh feature map",
    parentId: "sync_a_repository",
    summary:
      "User can sync the selected repository and see an updated feature tree.",
    match: (artifact) =>
      artifact.path.startsWith("lib/repo/") ||
      artifact.path === "app/api/scan-repo/route.ts",
  },
  {
    id: "choose_repository",
    title: "Choose repository",
    parentId: "sync_a_repository",
    summary:
      "User can switch to another local repository and rebuild the canvas from it.",
    match: (artifact) =>
      artifact.path === "app/api/repo/current/route.ts" ||
      artifact.path === "app/api/repo/select/route.ts",
  },
  {
    id: "watch_live_working_nodes",
    title: "Watch live working nodes",
    parentId: "follow_codex_work",
    summary:
      "User can see active Codex work appear as working nodes on the canvas.",
    match: (artifact) =>
      artifact.path.startsWith("server/") ||
      artifact.path.startsWith("mcp-server/") ||
      artifact.path.startsWith("plugin/") ||
      artifact.path.startsWith("plugins/codex-live-canvas/") ||
      artifact.path.startsWith("app/api/live-canvas/") ||
      artifact.path.startsWith("lib/liveCanvas/"),
  },
  {
    id: "start_codex_task",
    title: "Start Codex task",
    parentId: "follow_codex_work",
    summary:
      "User can ask Codex to work from the canvas and track the resulting task.",
    match: (artifact) =>
      artifact.path.startsWith("components/codex/") ||
      artifact.path.startsWith("lib/codex/") ||
      artifact.path.startsWith("lib/observer/") ||
      artifact.path === "app/api/codex/start/route.ts",
  },
  {
    id: "keep_feature_status_updated",
    title: "Keep feature status updated",
    parentId: "trust_the_feature_map",
    summary:
      "User can rely on status, relationships, evidence, and history staying in sync.",
    match: (artifact) =>
      artifact.path.startsWith("lib/graph/") ||
      artifact.path.startsWith("lib/state/") ||
      artifact.path.startsWith("lib/types/"),
  },
  {
    id: "try_demo_flow",
    title: "Try demo flow",
    parentId: "open_feature_canvas",
    summary:
      "User can run a demo and see a feature map grow from example work.",
    match: (artifact) =>
      artifact.path.startsWith("lib/demo/"),
  },
  {
    id: "read_product_guidance",
    title: "Read product guidance",
    parentId: "trust_the_feature_map",
    summary:
      "User can refer to product notes, architecture docs, and demo scripts.",
    match: (artifact) =>
      artifact.path.startsWith("docs/") ||
      artifact.path === "README.md",
  },
  {
    id: "run_the_app_reliably",
    title: "Run the app reliably",
    parentId: "trust_the_feature_map",
    summary: "User can run, build, and configure the app reliably.",
    match: (artifact) =>
      configFilePattern.test(artifact.path) || artifact.path.startsWith("public/"),
  },
];

function eventSafeId(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function evidenceId(featureId: string, path: string) {
  return `${featureId}_${eventSafeId(path)}_evidence`;
}

function tokenize(value: string) {
  const stopWords = new Set([
    "a",
    "an",
    "and",
    "are",
    "as",
    "be",
    "by",
    "can",
    "for",
    "from",
    "in",
    "is",
    "it",
    "of",
    "on",
    "or",
    "the",
    "to",
    "user",
    "with",
  ]);

  const synonymMap: Record<string, string[]> = {
    choose: ["select", "pick"],
    codebase: ["repo", "repository"],
    detail: ["details", "inspector", "evidence"],
    details: ["detail", "inspector", "evidence"],
    feature: ["graph", "canvas", "node"],
    features: ["graph", "canvas", "nodes"],
    map: ["graph", "canvas"],
    node: ["feature", "inspector"],
    nodes: ["features", "graph"],
    open: ["view", "show", "page"],
    refresh: ["sync", "scan", "rebuild"],
    repository: ["repo", "codebase"],
    sync: ["scan", "refresh"],
  };

  const tokens = value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 2 && !stopWords.has(token));

  return Array.from(
    new Set(tokens.flatMap((token) => [token, ...(synonymMap[token] ?? [])])),
  );
}

function artifactSearchText(artifact: ArtifactRef) {
  return `${artifact.path} ${artifact.role ?? ""} ${artifact.kind}`;
}

function matchingArtifacts(artifacts: ArtifactRef[], text: string) {
  const tokens = tokenize(text);

  if (tokens.length === 0) {
    return [];
  }

  return artifacts
    .map((artifact) => {
      const searchable = artifactSearchText(artifact).toLowerCase();
      const score = tokens.filter((token) => searchable.includes(token)).length;

      return { artifact, score };
    })
    .filter((match) => match.score >= Math.min(2, tokens.length))
    .sort((left, right) => right.score - left.score)
    .map((match) => match.artifact);
}

function dedupeArtifacts(artifacts: ArtifactRef[]) {
  const seen = new Set<string>();

  return artifacts.filter((artifact) => {
    if (seen.has(artifact.path)) {
      return false;
    }

    seen.add(artifact.path);
    return true;
  });
}

function filesSummary(artifacts: ArtifactRef[]) {
  const count = artifacts.length;
  const label = count === 1 ? "file" : "files";
  const kinds = Array.from(new Set(artifacts.map((artifact) => artifact.kind)))
    .sort()
    .join(", ");

  return `${count} ${label}${kinds ? ` across ${kinds}` : ""}.`;
}

function representativeArtifacts(artifacts: ArtifactRef[]) {
  return artifacts
    .slice()
    .sort((left, right) => {
      if (left.kind === right.kind) {
        return left.path.localeCompare(right.path);
      }

      return left.kind.localeCompare(right.kind);
    })
    .slice(0, 5);
}

function fallbackDefinitionForKind(kind: ArtifactKind): RepoFeatureDefinition {
  switch (kind) {
    case "ui":
      return {
        id: "open_product_screens",
        title: "Open product screens",
        parentId: "open_feature_canvas",
        summary:
          "User can open and interact with screens in the product.",
        match: (artifact) => artifact.kind === "ui",
      };
    case "api":
      return {
        id: "complete_product_actions",
        title: "Complete product actions",
        parentId: "open_feature_canvas",
        summary:
          "User can complete actions exposed through product workflows.",
        match: (artifact) => artifact.kind === "api",
      };
    case "db":
      return {
        id: "save_product_data",
        title: "Save product data",
        parentId: "trust_the_feature_map",
        summary: "User data and product state can be stored and retrieved.",
        match: (artifact) => artifact.kind === "db",
      };
    case "service":
      return {
        id: "apply_product_rules",
        title: "Apply product rules",
        parentId: "trust_the_feature_map",
        summary:
          "User-facing behavior follows the product rules behind the scenes.",
        match: (artifact) => artifact.kind === "service",
      };
    case "test":
      return {
        id: "verify_product_behavior",
        title: "Verify product behavior",
        parentId: "trust_the_feature_map",
        summary:
          "User can trust important behavior because it has tests and checks.",
        match: (artifact) => artifact.kind === "test",
      };
    case "external":
    case "unknown":
      return {
        id: "support_product_runtime",
        title: "Support product runtime",
        parentId: "trust_the_feature_map",
        summary:
          "Supporting code keeps the product running without becoming a visible technical directory.",
        match: (artifact) => artifact.kind === "external" || artifact.kind === "unknown",
      };
  }
}

function fallbackDefinitionFor(artifact: ArtifactRef): RepoFeatureDefinition {
  if (artifact.path.endsWith(".md")) {
    return {
      id: "product_guidance",
      title: "Read product guidance",
      parentId: "trust_the_feature_map",
      summary:
        "Written guidance, notes, and documentation that describe product behavior.",
      match: (candidate) => candidate.path.endsWith(".md"),
    };
  }

  if (configFilePattern.test(artifact.path)) {
    return featureDefinitions.at(-1) ?? fallbackDefinitionForKind(artifact.kind);
  }

  return fallbackDefinitionForKind(artifact.kind);
}

function groupArtifacts(artifacts: ArtifactRef[]) {
  const groups = new Map<string, {
    definition: RepoFeatureDefinition;
    artifacts: ArtifactRef[];
  }>();

  for (const artifact of artifacts) {
    const definition =
      featureDefinitions.find((candidate) => candidate.match(artifact)) ??
      fallbackDefinitionFor(artifact);
    const group = groups.get(definition.id) ?? {
      definition,
      artifacts: [],
    };

    group.artifacts.push(artifact);
    groups.set(definition.id, group);
  }

  return Array.from(groups.values()).sort((left, right) =>
    left.definition.title.localeCompare(right.definition.title),
  );
}

function parentFeatureFor(id: string) {
  return parentFeatureDefinitions.find((definition) => definition.id === id);
}

function allRelatedFiles(groups: ReturnType<typeof groupArtifacts>, parentId: string) {
  return groups
    .filter((group) => group.definition.parentId === parentId)
    .flatMap((group) => group.artifacts.map((artifact) => artifact.path));
}

function prdFeatureText(feature: ParsedPrdFeature) {
  return [
    feature.name,
    feature.description ?? "",
    ...feature.acceptanceCriteria.map((criterion) => criterion.text),
  ].join(" ");
}

function buildPrdAlignedGraphEvents(
  artifacts: ArtifactRef[],
  parsedPrd: ParsedPrd,
): GraphEvent[] {
  const rootId = `prd_${eventSafeId(parsedPrd.title) || "product"}`;
  const events: GraphEvent[] = [
    {
      type: "node.upsert",
      node: {
        id: rootId,
        nodeType: "feature",
        title: parsedPrd.title,
        status: "implemented",
        summary:
          "PRD feature map. Child nodes show designed capabilities and whether code evidence was found.",
        confidence: 0.82,
        relatedFiles: [],
      },
    },
  ];

  parsedPrd.features.forEach((feature) => {
    const featureMatches = dedupeArtifacts(
      matchingArtifacts(artifacts, prdFeatureText(feature)),
    );
    const featureId = eventSafeId(feature.id) || `feature_${eventSafeId(feature.name)}`;

    events.push({
      type: "node.upsert",
      node: {
        id: featureId,
        nodeType: "feature",
        title: feature.name,
        status: featureMatches.length > 0 ? "implemented" : "needs_evidence",
        summary:
          featureMatches.length > 0
            ? `${feature.description ?? "PRD feature"} Code evidence found for this PRD feature.`
            : `${feature.description ?? "PRD feature"} No matching code evidence found yet.`,
        confidence: featureMatches.length > 0 ? 0.78 : 0.55,
        relatedFiles: featureMatches.map((artifact) => artifact.path),
      },
    });
    events.push({
      type: "edge.upsert",
      edge: {
        id: `${rootId}_contains_${featureId}`,
        from: rootId,
        to: featureId,
        relation: "contains",
        label: "contains",
      },
    });
    events.push({
      type: "evidence.add",
      targetId: featureId,
      evidence: {
        id: `${featureId}_prd`,
        kind: "plan",
        summary: feature.description ?? "Feature came from the pasted PRD.",
      },
    });

    representativeArtifacts(featureMatches).forEach((artifact) => {
      events.push({
        type: "evidence.add",
        targetId: featureId,
        evidence: {
          id: evidenceId(featureId, artifact.path),
          kind: "file",
          summary: `Possible implementation evidence: ${artifact.path}`,
          path: artifact.path,
        },
      });
    });

    feature.acceptanceCriteria.forEach((criterion, index) => {
      const criterionMatches = dedupeArtifacts(
        matchingArtifacts(
          featureMatches.length > 0 ? featureMatches : artifacts,
          criterion.text,
        ),
      );
      const criterionId = `${featureId}_${eventSafeId(criterion.id) || `criterion_${index + 1}`}`;

      events.push({
        type: "node.upsert",
        node: {
          id: criterionId,
          nodeType: "feature",
          title: criterion.text,
          status: criterionMatches.length > 0 ? "implemented" : "needs_evidence",
          summary:
            criterionMatches.length > 0
              ? "Acceptance point has possible code evidence."
              : "Acceptance point is still missing code evidence.",
          confidence: criterionMatches.length > 0 ? 0.7 : 0.48,
          relatedFiles: criterionMatches.map((artifact) => artifact.path),
        },
      });
      events.push({
        type: "edge.upsert",
        edge: {
          id: `${featureId}_contains_${criterionId}`,
          from: featureId,
          to: criterionId,
          relation: "contains",
          label: "acceptance",
        },
      });

      if (criterionMatches.length === 0) {
        events.push({
          type: "risk.add",
          targetId: criterionId,
          risk: {
            id: `${criterionId}_missing_evidence`,
            severity: "medium",
            summary: "No code evidence matched this PRD acceptance point.",
          },
        });
      }

      representativeArtifacts(criterionMatches).forEach((artifact) => {
        events.push({
          type: "evidence.add",
          targetId: criterionId,
          evidence: {
            id: evidenceId(criterionId, artifact.path),
            kind: "file",
            summary: `Possible acceptance evidence: ${artifact.path}`,
            path: artifact.path,
          },
        });
      });
    });
  });

  return events;
}

export function buildRepoGraphEvents(
  artifacts: ArtifactRef[],
  parsedPrd?: ParsedPrd,
): GraphEvent[] {
  if (parsedPrd && parsedPrd.features.length > 0) {
    return buildPrdAlignedGraphEvents(artifacts, parsedPrd);
  }

  const groups = groupArtifacts(artifacts);
  const usedParentIds = Array.from(
    new Set(groups.map((group) => group.definition.parentId)),
  ).sort((left, right) => {
    const leftTitle = parentFeatureFor(left)?.title ?? left;
    const rightTitle = parentFeatureFor(right)?.title ?? right;

    return leftTitle.localeCompare(rightTitle);
  });
  const events: GraphEvent[] = [
    {
      type: "node.upsert",
      node: {
        id: rootNodeId,
        nodeType: "feature",
        title: "Use cocanvas",
        status: groups.length > 0 ? "implemented" : "needs_evidence",
        summary:
          groups.length > 0
            ? `Synced ${artifacts.length} repository artifacts into ${groups.length} product-friendly feature areas. Technical files are kept in node details.`
            : "No supported source files were found during the repository scan.",
        confidence: 0.78,
        relatedFiles: [],
      },
    },
  ];

  usedParentIds.forEach((parentId) => {
    const parent = parentFeatureFor(parentId);

    if (!parent) {
      return;
    }

    const childCount = groups.filter(
      (group) => group.definition.parentId === parentId,
    ).length;

    events.push({
      type: "node.upsert",
      node: {
        id: parent.id,
        nodeType: "feature",
        title: parent.title,
        status: "implemented",
        summary: `${parent.summary} Includes ${childCount} synced feature ${childCount === 1 ? "area" : "areas"}.`,
        confidence: 0.72,
        relatedFiles: allRelatedFiles(groups, parentId),
      },
    });
    events.push({
      type: "edge.upsert",
      edge: {
        id: `${rootNodeId}_contains_${parent.id}`,
        from: rootNodeId,
        to: parent.id,
        relation: "contains",
        label: "contains",
      },
    });
  });

  groups.forEach(({ definition, artifacts: featureArtifacts }) => {
    events.push({
      type: "node.upsert",
      node: {
        id: definition.id,
        nodeType: "feature",
        title: definition.title,
        status: "implemented",
        summary: `${definition.summary} ${filesSummary(featureArtifacts)}`,
        confidence: 0.74,
        relatedFiles: featureArtifacts.map((artifact) => artifact.path),
      },
    });
    events.push({
      type: "edge.upsert",
      edge: {
        id: `${definition.parentId}_contains_${definition.id}`,
        from: definition.parentId,
        to: definition.id,
        relation: "contains",
        label: "contains",
      },
    });

    representativeArtifacts(featureArtifacts).forEach((artifact) => {
      events.push({
        type: "evidence.add",
        targetId: definition.id,
        evidence: {
          id: evidenceId(definition.id, artifact.path),
          kind: "file",
          summary: `${artifact.role ?? "Repository artifact"}: ${artifact.path}`,
          path: artifact.path,
        },
      });
    });
  });

  return events;
}
