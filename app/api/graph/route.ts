import { NextResponse } from "next/server";
import { readGraphEvents } from "@/lib/graph/readGraphEvents";
import { reduceGraphEvents } from "@/lib/graph/reduceGraphEvents";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const repoPath = searchParams.get("repoPath")?.trim() || process.cwd();
  const events = await readGraphEvents(repoPath);

  return NextResponse.json({
    events,
    graph: reduceGraphEvents(events),
  });
}
