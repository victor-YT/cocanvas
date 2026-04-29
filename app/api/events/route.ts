import { NextResponse } from "next/server";
import { mockCodexEvents } from "@/lib/demo/mockCodexEvents";

export async function GET() {
  return NextResponse.json({
    mode: "mock",
    events: mockCodexEvents,
  });
}
