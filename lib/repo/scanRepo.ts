import { readdir, readFile } from "node:fs/promises";
import { basename, extname, join, relative, sep } from "node:path";

export type RepoArtifactKind =
  | "page"
  | "layout"
  | "api"
  | "component"
  | "service"
  | "database"
  | "test";

export type RepoArtifact = {
  path: string;
  kind: RepoArtifactKind;
  name: string;
  contentPreview: string;
};

const ignoredDirectories = new Set([
  ".git",
  ".next",
  ".cocanvas",
  "coverage",
  "dist",
  "build",
  "node_modules",
  "out",
]);

function toPosixPath(path: string) {
  return path.split(sep).join("/");
}

function titleCase(value: string) {
  const words = value
    .replace(/\.[^.]+$/, "")
    .replace(/\[[^\]]+\]/g, "detail")
    .replace(/^\(.*\)$/, "")
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

function routeSegments(path: string, prefix: string) {
  return path
    .replace(prefix, "")
    .replace(/\/(page|layout|route)\.tsx?$/, "")
    .replace(/^(page|layout|route)\.tsx?$/, "")
    .split("/")
    .filter((part) => part && !part.startsWith("(") && !part.startsWith("@"));
}

function artifactKind(path: string): RepoArtifactKind | undefined {
  if (path === "prisma/schema.prisma") {
    return "database";
  }

  if (
    path.startsWith("tests/") &&
    (path.endsWith(".test.ts") || path.endsWith(".spec.ts"))
  ) {
    return "test";
  }

  if (path.startsWith("app/api/") && path.endsWith("/route.ts")) {
    return "api";
  }

  if (path.startsWith("app/") && path.endsWith("/page.tsx")) {
    return "page";
  }

  if (path === "app/page.tsx") {
    return "page";
  }

  if (path.startsWith("app/") && path.endsWith("/layout.tsx")) {
    return "layout";
  }

  if (path === "app/layout.tsx") {
    return "layout";
  }

  if (path.startsWith("components/") && path.endsWith(".tsx")) {
    return "component";
  }

  if (path.startsWith("src/") && path.endsWith(".ts") && !path.endsWith(".d.ts")) {
    return "service";
  }

  return undefined;
}

function artifactName(path: string, kind: RepoArtifactKind) {
  if (kind === "database") {
    return "Prisma Schema";
  }

  if (kind === "page") {
    const segments = routeSegments(path, "app/");
    return segments.length === 0 ? "Main Page" : `${titleCase(segments.join(" "))} Page`;
  }

  if (kind === "layout") {
    const segments = routeSegments(path, "app/");
    return segments.length === 0
      ? "Application Layout"
      : `${titleCase(segments.join(" "))} Layout`;
  }

  if (kind === "api") {
    const segments = routeSegments(path, "app/api/");
    return `${titleCase(segments.join(" "))} API`;
  }

  if (kind === "test") {
    return `${titleCase(basename(path).replace(/\.(test|spec)\.ts$/, ""))} Tests`;
  }

  return titleCase(basename(path, extname(path)));
}

function normalizePreview(contents: string) {
  return contents.replace(/\s+/g, " ").trim().slice(0, 500);
}

async function walk(rootPath: string, directory = rootPath): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const results = await Promise.all(
    entries.map(async (entry) => {
      if (entry.isDirectory()) {
        if (ignoredDirectories.has(entry.name)) {
          return [];
        }

        return walk(rootPath, join(directory, entry.name));
      }

      if (!entry.isFile()) {
        return [];
      }

      return [toPosixPath(relative(rootPath, join(directory, entry.name)))];
    }),
  );

  return results.flat();
}

export async function scanRepo(rootPath: string): Promise<RepoArtifact[]> {
  const files = await walk(rootPath);
  const artifacts = await Promise.all(
    files.map(async (path) => {
      const kind = artifactKind(path);

      if (!kind) {
        return undefined;
      }

      const contents = await readFile(join(rootPath, path), "utf8").catch(() => "");

      return {
        path,
        kind,
        name: artifactName(path, kind),
        contentPreview: normalizePreview(contents),
      };
    }),
  );

  return artifacts
    .filter((artifact): artifact is RepoArtifact => artifact !== undefined)
    .sort((a, b) => a.path.localeCompare(b.path));
}
