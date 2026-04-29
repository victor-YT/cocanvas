import { NextResponse } from "next/server";
import { reduceGraphEvents } from "@/lib/graph/reduceGraphEvents";

export async function POST() {
  return NextResponse.json({
    events: [],
    graph: reduceGraphEvents([]),
  });
}
