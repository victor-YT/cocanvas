import { NextResponse } from "next/server";
import { mockGraphEvents } from "@/lib/demo/mockGraphEvents";
import { reduceGraphEvents } from "@/lib/graph/reduceGraphEvents";

export async function POST() {
  return NextResponse.json({
    events: mockGraphEvents,
    graph: reduceGraphEvents(mockGraphEvents),
  });
}
