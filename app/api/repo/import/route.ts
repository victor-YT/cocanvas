import { NextResponse } from "next/server";
import { appendGraphEvents } from "@/lib/graph/writeGraphEvents";
import { reduceGraphEvents } from "@/lib/graph/reduceGraphEvents";
import { inferFeatureGraphEventsFromArtifacts } from "@/lib/repo/inferFeatureGraphEvents";
import { scanRepo } from "@/lib/repo/scanRepo";

export const runtime = "nodejs";

type RepoImportBody = {
  repoPath?: unknown;
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
    const events = inferFeatureGraphEventsFromArtifacts(artifacts);
    let persistedGraphEvents = false;

    try {
      await appendGraphEvents(repoPath, events);
      persistedGraphEvents = true;
    } catch (error) {
      console.error(error);
    }

    return NextResponse.json({
      mode: "repo-import",
      artifacts,
      events,
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
