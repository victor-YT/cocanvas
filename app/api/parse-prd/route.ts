import { NextResponse } from "next/server";
import { parsePrd } from "@/lib/prd/parsePrd";

export async function POST(request: Request) {
  const body = (await request.json()) as { prd?: string };
  const parsed = await parsePrd(body.prd ?? "");

  return NextResponse.json(parsed);
}
