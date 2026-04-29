import { NextResponse } from "next/server";
import { access } from "node:fs/promises";
import { join } from "node:path";
import { mockGraphEvents } from "@/lib/demo/mockGraphEvents";
import { readGraphEvents } from "@/lib/graph/readGraphEvents";
import { reduceGraphEvents } from "@/lib/graph/reduceGraphEvents";
import type { GraphEvent } from "@/lib/types/observedGraph";

export const runtime = "nodejs";

type SanitizedGraphEvents = {
  events: GraphEvent[];
  missingRelatedFilesByNodeId: Record<string, string[]>;
};

const demoNodeIds = new Set(
  mockGraphEvents
    .filter((event) => event.type === "node.upsert")
    .map((event) => (event.type === "node.upsert" ? event.node.id : "")),
);

async function fileExists(rootPath: string, filePath: string) {
  try {
    await access(join(rootPath, filePath));
    return true;
  } catch {
    return false;
  }
}

async function splitExistingFiles(rootPath: string, files: string[] = []) {
  const existing: string[] = [];
  const missing: string[] = [];

  await Promise.all(
    files.map(async (file) => {
      if (await fileExists(rootPath, file)) {
        existing.push(file);
        return;
      }

      missing.push(file);
    }),
  );

  return { existing, missing };
}

function addMissingFile(
  missingRelatedFilesByNodeId: Record<string, string[]>,
  nodeId: string,
  file?: string,
) {
  if (!file) {
    return;
  }

  const files = missingRelatedFilesByNodeId[nodeId] ?? [];

  if (!files.includes(file)) {
    missingRelatedFilesByNodeId[nodeId] = [...files, file];
  }
}

async function sanitizeGraphEvents(
  rootPath: string,
  events: GraphEvent[],
): Promise<SanitizedGraphEvents> {
  const missingRelatedFilesByNodeId: Record<string, string[]> = {};
  const droppedNodeIds = new Set<string>();
  const sanitizedEvents: GraphEvent[] = [];

  for (const event of events) {
    if (event.type === "node.upsert") {
      if (demoNodeIds.has(event.node.id)) {
        droppedNodeIds.add(event.node.id);
        continue;
      }

      const { existing, missing } = await splitExistingFiles(
        rootPath,
        event.node.relatedFiles,
      );

      missing.forEach((file) =>
        addMissingFile(missingRelatedFilesByNodeId, event.node.id, file),
      );

      sanitizedEvents.push({
        ...event,
        node: {
          ...event.node,
          relatedFiles: existing,
        },
      });
      continue;
    }

    if (
      event.type === "edge.upsert" &&
      (droppedNodeIds.has(event.edge.from) || droppedNodeIds.has(event.edge.to))
    ) {
      continue;
    }

    if (event.type === "status.update" && droppedNodeIds.has(event.targetId)) {
      continue;
    }

    if (event.type === "evidence.add") {
      if (droppedNodeIds.has(event.targetId)) {
        continue;
      }

      if (event.evidence.path && !(await fileExists(rootPath, event.evidence.path))) {
        addMissingFile(
          missingRelatedFilesByNodeId,
          event.targetId,
          event.evidence.path,
        );
        sanitizedEvents.push({
          ...event,
          evidence: {
            ...event.evidence,
            path: undefined,
          },
        });
        continue;
      }
    }

    if (event.type === "risk.add") {
      if (droppedNodeIds.has(event.targetId)) {
        continue;
      }

      if (event.risk.path && !(await fileExists(rootPath, event.risk.path))) {
        addMissingFile(missingRelatedFilesByNodeId, event.targetId, event.risk.path);
        sanitizedEvents.push({
          ...event,
          risk: {
            ...event.risk,
            path: undefined,
          },
        });
        continue;
      }
    }

    sanitizedEvents.push(event);
  }

  return {
    events: sanitizedEvents,
    missingRelatedFilesByNodeId,
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const repoPath = searchParams.get("repoPath")?.trim() || process.cwd();
  const savedEvents = await readGraphEvents(repoPath);
  const { events, missingRelatedFilesByNodeId } = await sanitizeGraphEvents(
    repoPath,
    savedEvents,
  );

  return NextResponse.json({
    events,
    graph: reduceGraphEvents(events),
    missingRelatedFilesByNodeId,
  });
}
