import { NextResponse } from "next/server";
import { mockCodexEvents } from "@/lib/demo/mockCodexEvents";

export async function POST(request: Request) {
  const body = (await request.json()) as { repoPath?: string; prompt?: string };

  return NextResponse.json({
    mode: "mock",
    repoPath: body.repoPath ?? ".",
    prompt: body.prompt ?? "",
    events: mockCodexEvents,
  });
}
