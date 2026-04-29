import { NextResponse } from "next/server";
import { readGraphEvents } from "@/lib/graph/readGraphEvents";
import { reduceGraphEvents } from "@/lib/graph/reduceGraphEvents";

export const runtime = "nodejs";

export async function GET() {
  const events = await readGraphEvents();

  return NextResponse.json({
    events,
    graph: reduceGraphEvents(events),
  });
}
