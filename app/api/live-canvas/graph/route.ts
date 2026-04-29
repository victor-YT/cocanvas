import { proxyJson } from "../config";

export async function GET() {
  return proxyJson("/api/graph");
}
