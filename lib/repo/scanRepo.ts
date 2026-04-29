import { readdir, stat } from "node:fs/promises";
import { relative, resolve } from "node:path";
import type { ArtifactKind, ArtifactRef } from "@/lib/types/graph";
import { mockRepoScan } from "./mockRepoScan";

const IGNORED_DIRS = new Set([
  ".git",
  ".next",
  "node_modules",
  "dist",
  "build",
  "coverage",
]);
const SUPPORTED_EXTENSIONS = /\.(ts|tsx|js|jsx|mjs|cjs|json|md)$/;
const MAX_FILES = 250;

function artifactId(path: string) {
  return `artifact-${path
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")}`;
}

function detectKind(path: string): ArtifactKind {
  const normalized = path.toLowerCase();

  if (/(\.test\.|\.spec\.|__tests__|\/tests?\/)/.test(normalized)) {
    return "test";
  }

  if (/\/api\/|route\.(ts|js)$/.test(normalized)) {
    return "api";
  }

  if (/(page|layout|component|view)\.(tsx|jsx)$|\/components?\//.test(normalized)) {
    return "ui";
  }

  if (/schema|migration|database|db\//.test(normalized)) {
    return "db";
  }

  if (/service|auth|token|reset|lib\/|src\//.test(normalized)) {
    return "service";
  }

  return "unknown";
}

function roleForKind(kind: ArtifactKind) {
  switch (kind) {
    case "api":
      return "API boundary";
    case "db":
      return "Persistence";
    case "service":
      return "Business logic";
    case "test":
      return "Verification";
    case "ui":
      return "User interface";
    default:
      return "Repository artifact";
  }
}

async function walkRepo(root: string, dir = root, files: string[] = []) {
  if (files.length >= MAX_FILES) {
    return files;
  }

  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (files.length >= MAX_FILES) {
      break;
    }

    if (entry.isDirectory()) {
      if (!IGNORED_DIRS.has(entry.name)) {
        await walkRepo(root, resolve(dir, entry.name), files);
      }

      continue;
    }

    if (entry.isFile() && SUPPORTED_EXTENSIONS.test(entry.name)) {
      files.push(relative(root, resolve(dir, entry.name)).replaceAll("\\", "/"));
    }
  }

  return files;
}

export async function scanRepo(repoPath: string): Promise<ArtifactRef[]> {
  const workspaceRoot = process.cwd();
  const requestedRoot = resolve(
    /* turbopackIgnore: true */ workspaceRoot,
    repoPath || ".",
  );
  const root = requestedRoot.startsWith(workspaceRoot)
    ? requestedRoot
    : workspaceRoot;

  try {
    const rootStat = await stat(root);

    if (!rootStat.isDirectory()) {
      return mockRepoScan();
    }

    const files = await walkRepo(root);

    return files.map((path) => {
      const kind = detectKind(path);

      return {
        id: artifactId(path),
        path,
        kind,
        role: roleForKind(kind),
        confidence: kind === "unknown" ? 0.35 : 0.62,
        evidence: "Detected by lightweight repository scan.",
      };
    });
  } catch {
    return mockRepoScan();
  }
}
