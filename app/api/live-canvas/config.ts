export const liveCanvasApiUrl =
  process.env.LIVE_CANVAS_API_URL?.replace(/\/$/, "") ??
  "http://127.0.0.1:4000";

export async function proxyJson(path: string, init?: RequestInit) {
  const response = await fetch(`${liveCanvasApiUrl}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
      ...init?.headers,
    },
  });

  const body = await response.text();

  return new Response(body, {
    status: response.status,
    headers: {
      "content-type": response.headers.get("content-type") ?? "application/json",
    },
  });
}
