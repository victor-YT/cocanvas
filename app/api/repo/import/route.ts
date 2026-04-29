import { NextResponse } from "next/server";
import { appendGraphEvents } from "@/lib/graph/writeGraphEvents";
import { reduceGraphEvents } from "@/lib/graph/reduceGraphEvents";
import { inferFeatureGraphFromArtifacts } from "@/lib/repo/inferFeatureGraphEvents";
import { scanRepo } from "@/lib/repo/scanRepo";

export const runtime = "nodejs";

type RepoImportBody = {
  repoPath?: unknown;
  persist?: unknown;
};

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  const body = (await request.json()) as RepoImportBody;
  const repoPath = readString(body.repoPath);

  if (!repoPath) {
    return NextResponse.json(
      { error: "repoPath is required." },
      { status: 400 },
    );
  }

  try {
    const artifacts = await scanRepo(repoPath);
    const inference = inferFeatureGraphFromArtifacts(artifacts);
    const events = inference.events;
    const shouldPersist = body.persist !== false;
    let persistedGraphEvents = false;

    if (shouldPersist) {
      try {
        await appendGraphEvents(repoPath, events);
        persistedGraphEvents = true;
      } catch (error) {
        console.error(error);
      }
    }

    return NextResponse.json({
      mode: "repo-import",
      artifacts,
      events,
      productAreaCount: inference.productAreaCount,
      graph: reduceGraphEvents(events),
      persistedGraphEvents,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Repository import failed.",
      },
      { status: 500 },
    );
  }
}
