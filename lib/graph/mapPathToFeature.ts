import type { FeatureNode, GraphState } from "@/lib/types/graph";

const STOP_WORDS = new Set([
  "app",
  "api",
  "src",
  "lib",
  "test",
  "tests",
  "spec",
  "route",
  "page",
  "index",
  "component",
  "components",
  "service",
  "services",
  "and",
  "are",
  "for",
  "from",
  "into",
  "that",
  "the",
  "this",
  "with",
]);

export type FeaturePathMatch = {
  feature: FeatureNode;
  confidence: number;
  reason: "artifact_exact" | "artifact_basename" | "artifact_tokens" | "feature_tokens";
  matchedTokens: string[];
};

function normalizeToken(token: string) {
  if (token.endsWith("ies") && token.length > 4) {
    return `${token.slice(0, -3)}y`;
  }

  if (token.endsWith("ed") && token.length > 4) {
    return token.endsWith("ied") ? `${token.slice(0, -3)}y` : token.slice(0, -1);
  }

  if (token.endsWith("es") && token.length > 4) {
    return token.slice(0, -1);
  }

  if (token.endsWith("s") && token.length > 3) {
    return token.slice(0, -1);
  }

  return token;
}

function normalizePath(path: string) {
  return path.replaceAll("\\", "/").replace(/^\.\//, "").toLowerCase();
}

function basename(path: string) {
  return normalizePath(path).split("/").at(-1) ?? path;
}

export function tokenize(value: string) {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .map(normalizeToken)
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

function unique(tokens: string[]) {
  return [...new Set(tokens)];
}

function tokenOverlap(candidateTokens: string[], targetTokens: string[]) {
  const target = new Set(targetTokens);
  return unique(candidateTokens).filter((token) => target.has(token));
}

function featureTokens(feature: FeatureNode) {
  return unique([
    ...tokenize(feature.name),
    ...tokenize(feature.description ?? ""),
    ...feature.acceptanceCriteria.flatMap((criterion) => tokenize(criterion.text)),
  ]);
}

function artifactTokens(feature: FeatureNode) {
  return unique(
    feature.artifacts.flatMap((artifact) => [
      ...tokenize(artifact.path),
      ...tokenize(artifact.role ?? ""),
    ]),
  );
}

function scoreFeaturePath(path: string, feature: FeatureNode): FeaturePathMatch | undefined {
  const normalizedPath = normalizePath(path);
  const pathBase = basename(path);
  const pathTokens = unique(tokenize(path));

  for (const artifact of feature.artifacts) {
    const artifactPath = normalizePath(artifact.path);
    const artifactBase = basename(artifact.path);

    if (artifactPath === normalizedPath) {
      return {
        feature,
        confidence: 1,
        reason: "artifact_exact",
        matchedTokens: tokenize(artifact.path),
      };
    }

    if (artifactBase === pathBase) {
      return {
        feature,
        confidence: 0.94,
        reason: "artifact_basename",
        matchedTokens: tokenize(artifactBase),
      };
    }
  }

  const artifactMatches = tokenOverlap(pathTokens, artifactTokens(feature));
  if (artifactMatches.length >= 2) {
    return {
      feature,
      confidence: Math.min(0.88, 0.52 + artifactMatches.length * 0.12),
      reason: "artifact_tokens",
      matchedTokens: artifactMatches,
    };
  }

  const featureMatches = tokenOverlap(pathTokens, featureTokens(feature));
  if (featureMatches.length >= 2) {
    return {
      feature,
      confidence: Math.min(0.76, 0.44 + featureMatches.length * 0.1),
      reason: "feature_tokens",
      matchedTokens: featureMatches,
    };
  }

  return undefined;
}

export function mapPathToFeatureMatch(
  path: string,
  graph: GraphState,
): FeaturePathMatch | undefined {
  return graph.features
    .map((feature) => scoreFeaturePath(path, feature))
    .filter((match): match is FeaturePathMatch => match !== undefined)
    .sort((a, b) => b.confidence - a.confidence)[0];
}

export function mapTextToFeatureMatches(
  text: string,
  graph: GraphState,
): FeaturePathMatch[] {
  const textTokens = unique(tokenize(text));

  return graph.features
    .map<FeaturePathMatch | undefined>((feature) => {
      const matches = tokenOverlap(textTokens, [
        ...featureTokens(feature),
        ...artifactTokens(feature),
      ]);

      if (matches.length < 2) {
        return undefined;
      }

      return {
        feature,
        confidence: Math.min(0.72, 0.4 + matches.length * 0.08),
        reason: "feature_tokens" as const,
        matchedTokens: matches,
      };
    })
    .filter((match): match is FeaturePathMatch => match !== undefined)
    .sort((a, b) => b.confidence - a.confidence);
}

export function mapPathToFeature(path: string, graph: GraphState) {
  return mapPathToFeatureMatch(path, graph)?.feature;
}
