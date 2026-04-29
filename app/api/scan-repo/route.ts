import { NextResponse } from "next/server";
import { readJsonBody, readStringField } from "@/lib/api/readJsonBody";
import { parsePrd } from "@/lib/prd/parsePrd";
import { buildRepoGraphEvents } from "@/lib/repo/buildRepoGraphEvents";
import { scanRepo } from "@/lib/repo/scanRepo";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await readJsonBody(request);
  const repoPath = readStringField(body, "repoPath", ".");
  const prd = readStringField(body, "prd").trim();
  const artifacts = await scanRepo(repoPath);
  const parsedPrd = prd ? await parsePrd(prd) : undefined;

  return NextResponse.json({
    repoPath,
    scannedAt: new Date().toISOString(),
    artifacts,
    parsedPrd,
    graphEvents: buildRepoGraphEvents(artifacts, parsedPrd),
  });
}
