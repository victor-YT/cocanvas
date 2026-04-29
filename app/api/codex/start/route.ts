import { NextResponse } from "next/server";
import { CodexAppServerClient } from "@/lib/codex/appServerClient";
import { appendGraphEvents } from "@/lib/graph/writeGraphEvents";

export const runtime = "nodejs";
export const maxDuration = 180;

type CodexStartBody = {
  repoPath?: unknown;
  prompt?: unknown;
  model?: unknown;
};

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  const body = (await request.json()) as CodexStartBody;
  const repoPath = readString(body.repoPath);
  const prompt = readString(body.prompt);
  const model = readString(body.model);

  if (!repoPath) {
    return NextResponse.json(
      { error: "repoPath is required." },
      { status: 400 },
    );
  }

  if (!prompt) {
    return NextResponse.json(
      { error: "prompt is required." },
      { status: 400 },
    );
  }

  const timeoutMs = Number(process.env.CODEX_APP_SERVER_TIMEOUT_MS ?? 120000);
  const client = new CodexAppServerClient(timeoutMs);

  try {
    const result = await client.run({
      repoPath,
      prompt,
      model: model || undefined,
    });
    let persistedGraphEvents = false;

    try {
      await appendGraphEvents(repoPath, result.graphEvents);
      persistedGraphEvents = true;
    } catch (error) {
      console.error(error);
    }

    return NextResponse.json({
      mode: "codex-app-server",
      observerMode:
        result.observerGraphEvents.length > 0 ? "openai-responses" : "fallback",
      persistedGraphEvents,
      ...result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Codex task failed.",
      },
      { status: 500 },
    );
  }
}
