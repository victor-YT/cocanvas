import { NextResponse } from "next/server";
import { scanRepo } from "@/lib/repo/scanRepo";

export async function POST(request: Request) {
  const body = (await request.json()) as { repoPath?: string };
  const artifacts = await scanRepo(body.repoPath ?? ".");

  return NextResponse.json({ artifacts });
}
