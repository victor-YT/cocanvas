import { NextResponse } from "next/server";
import { readJsonBody, readStringField } from "@/lib/api/readJsonBody";
import { scanRepo } from "@/lib/repo/scanRepo";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await readJsonBody(request);
  const repoPath = readStringField(body, "repoPath", ".");
  const artifacts = await scanRepo(repoPath);

  return NextResponse.json({
    repoPath,
    scannedAt: new Date().toISOString(),
    artifacts,
  });
}
