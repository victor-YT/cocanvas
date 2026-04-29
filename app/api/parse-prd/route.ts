import { NextResponse } from "next/server";
import { readJsonBody, readStringField } from "@/lib/api/readJsonBody";
import { buildInitialGraph } from "@/lib/graph/buildInitialGraph";
import { parsePrd } from "@/lib/prd/parsePrd";

export async function POST(request: Request) {
  const body = await readJsonBody(request);
  const parsed = await parsePrd(readStringField(body, "prd"));

  return NextResponse.json({
    parsed,
    graph: buildInitialGraph(parsed),
  });
}
