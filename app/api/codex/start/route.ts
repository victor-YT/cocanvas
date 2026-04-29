import { NextResponse } from "next/server";
import { readJsonBody, readStringField } from "@/lib/api/readJsonBody";
import { mockCodexEvents } from "@/lib/demo/mockCodexEvents";
import { mockGraph } from "@/lib/demo/mockGraph";
import { replayCodexEvents } from "@/lib/graph/replayCodexEvents";

export async function POST(request: Request) {
  const body = await readJsonBody(request);
  const repoPath = readStringField(body, "repoPath", ".");
  const prompt = readStringField(body, "prompt");

  return NextResponse.json({
    taskId: crypto.randomUUID(),
    mode: "mock",
    repoPath,
    prompt,
    events: mockCodexEvents,
    graphAfterReplay: replayCodexEvents(mockGraph, mockCodexEvents),
  });
}
