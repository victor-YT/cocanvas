import { readdir, readFile } from "node:fs/promises";
import { basename, extname, join, relative, sep } from "node:path";

export type RepoArtifactKind =
  | "page"
  | "layout"
  | "api"
  | "app"
  | "component"
  | "service"
  | "database"
  | "test"
  | "style"
  | "config";

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
  ".turbo",
  ".vercel",
]);

const sourceExtensions = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);

const configFiles = new Set([
  "package.json",
  "next.config.ts",
  "next.config.js",
  "vite.config.ts",
  "vite.config.js",
  "tailwind.config.ts",
  "tailwind.config.js",
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

  if (configFiles.has(path)) {
    return "config";
  }

  if (path.endsWith(".css") && (path.startsWith("app/") || path.startsWith("styles/"))) {
    return "style";
  }

  if (
    (path.startsWith("tests/") ||
      path.startsWith("__tests__/") ||
      path.includes("/__tests__/")) &&
    (path.endsWith(".test.ts") ||
      path.endsWith(".test.tsx") ||
      path.endsWith(".spec.ts") ||
      path.endsWith(".spec.tsx"))
  ) {
    return "test";
  }

  if (path.startsWith("app/api/") && /\/route\.(ts|tsx)$/.test(path)) {
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

  const extension = extname(path);

  if (!sourceExtensions.has(extension) || path.endsWith(".d.ts")) {
    return undefined;
  }

  if (path.startsWith("app/")) {
    return "app";
  }

  if (path.startsWith("components/")) {
    return "component";
  }

  if (
    path.startsWith("src/") ||
    path.startsWith("lib/") ||
    path.startsWith("hooks/") ||
    path.startsWith("stores/") ||
    path.startsWith("utils/")
  ) {
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

  if (kind === "app") {
    return titleCase(path.replace(/^app\//, ""));
  }

  if (kind === "test") {
    return `${titleCase(basename(path).replace(/\.(test|spec)\.tsx?$/, ""))} Tests`;
  }

  if (kind === "style") {
    return `${titleCase(basename(path, extname(path)))} Styles`;
  }

  if (kind === "config") {
    return `${titleCase(basename(path, extname(path)))} Config`;
  }

  return titleCase(basename(path, extname(path)));
}

function normalizePreview(contents: string) {
  return contents;
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
