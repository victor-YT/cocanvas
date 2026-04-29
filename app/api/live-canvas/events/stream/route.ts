import { liveCanvasApiUrl } from "../../config";

export const dynamic = "force-dynamic";

export async function GET() {
  const upstream = await fetch(`${liveCanvasApiUrl}/api/events/stream`, {
    cache: "no-store",
    headers: {
      accept: "text/event-stream",
    },
  });

  if (!upstream.ok || !upstream.body) {
    return new Response("event: error\ndata: {\"error\":\"backend unavailable\"}\n\n", {
      status: 200,
      headers: sseHeaders(),
    });
  }

  return new Response(upstream.body, {
    status: 200,
    headers: sseHeaders(),
  });
}

function sseHeaders() {
  return {
    "content-type": "text/event-stream",
    "cache-control": "no-cache, no-transform",
    connection: "keep-alive",
  };
}
