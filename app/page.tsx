import { AppShell } from "@/components/layout/AppShell";
import {
  backendSnapshotToGraph,
  type BackendGraphSnapshot,
} from "@/lib/liveCanvas/backendGraphAdapter";

const liveCanvasApiUrl =
  process.env.LIVE_CANVAS_API_URL?.replace(/\/$/, "") ?? "http://127.0.0.1:4000";

export default async function Home() {
  const initialGraph = await fetch(`${liveCanvasApiUrl}/api/graph`, {
    cache: "no-store",
  })
    .then(async (response) =>
      response.ok
        ? backendSnapshotToGraph((await response.json()) as BackendGraphSnapshot)
        : undefined,
    )
    .catch(() => undefined);

  return <AppShell initialGraph={initialGraph} />;
}
