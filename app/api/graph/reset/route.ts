import { NextResponse } from "next/server";
import { reduceGraphEvents } from "@/lib/graph/reduceGraphEvents";
import { clearGraphEvents } from "@/lib/graph/writeGraphEvents";

type GraphResetBody = {
  repoPath?: unknown;
};

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as GraphResetBody;
  const repoPath = readString(body.repoPath);
  let persistedGraphEvents = false;

  if (repoPath) {
    try {
      await clearGraphEvents(repoPath);
      persistedGraphEvents = true;
    } catch (error) {
      console.error(error);
    }
  }

  return NextResponse.json({
    events: [],
    graph: reduceGraphEvents([]),
    persistedGraphEvents,
  });
}
