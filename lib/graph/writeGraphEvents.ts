import { appendFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { GraphEvent } from "@/lib/types/observedGraph";

const GRAPH_EVENTS_PATH = ".cocanvas/graph-events.jsonl";

export function graphEventsPathForRoot(rootPath: string) {
  return resolve(rootPath, GRAPH_EVENTS_PATH);
}

export async function appendGraphEvents(rootPath: string, events: GraphEvent[]) {
  if (events.length === 0) {
    return;
  }

  const filePath = graphEventsPathForRoot(rootPath);
  const lines = events.map((event) => JSON.stringify(event)).join("\n");

  await mkdir(dirname(filePath), { recursive: true });
  await appendFile(filePath, `${lines}\n`, "utf8");
}
