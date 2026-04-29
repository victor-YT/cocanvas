import { NextResponse } from "next/server";
import {
  appendGraphEvents,
  clearGraphEvents,
} from "@/lib/graph/writeGraphEvents";
import { observeRepoImportWithOpenAI } from "@/lib/observer/openaiRepoImportObserver";
import { reduceGraphEvents } from "@/lib/graph/reduceGraphEvents";
import { inferFeatureGraphFromArtifacts } from "@/lib/repo/inferFeatureGraphEvents";
import { scanRepo } from "@/lib/repo/scanRepo";

export const runtime = "nodejs";
export const maxDuration = 180;

type RepoImportBody = {
  repoPath?: unknown;
  persist?: unknown;
  replace?: unknown;
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
    let importMode = "openai-repo-import";
    let observerError: string | undefined;
    let inference;

    try {
      inference = await observeRepoImportWithOpenAI(repoPath, artifacts);
    } catch (error) {
      observerError = error instanceof Error ? error.message : "OpenAI import failed.";
    }

    if (!inference) {
      inference = inferFeatureGraphFromArtifacts(artifacts);
      importMode = "heuristic-fallback";
    }

    const events = inference.events;
    const shouldPersist = body.persist !== false;
    let persistedGraphEvents = false;

    if (shouldPersist) {
      try {
        if (body.replace === true) {
          await clearGraphEvents(repoPath);
        }

        await appendGraphEvents(repoPath, events);
        persistedGraphEvents = true;
      } catch (error) {
        console.error(error);
      }
    }

    return NextResponse.json({
      mode: importMode,
      artifacts,
      events,
      productAreaCount: inference.productAreaCount,
      graph: reduceGraphEvents(events),
      observerError,
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
