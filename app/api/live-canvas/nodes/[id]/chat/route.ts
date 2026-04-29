import { proxyJson } from "../../../config";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const body = await request.text();

  return proxyJson(`/api/nodes/${encodeURIComponent(id)}/chat`, {
    method: "POST",
    body,
  });
}
