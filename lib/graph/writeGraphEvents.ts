import { appendFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { GraphEvent } from "@/lib/types/observedGraph";

const GRAPH_EVENTS_PATH = ".cocanvas/graph-events.jsonl";
const RAW_EVENTS_PATH = ".cocanvas/raw-events.jsonl";

export function graphEventsPathForRoot(rootPath: string) {
  return resolve(rootPath, GRAPH_EVENTS_PATH);
}

export function rawEventsPathForRoot(rootPath: string) {
  return resolve(rootPath, RAW_EVENTS_PATH);
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

export async function appendRawEvents(rootPath: string, events: unknown[]) {
  if (events.length === 0) {
    return;
  }

  const filePath = rawEventsPathForRoot(rootPath);
  const timestamp = new Date().toISOString();
  const lines = events
    .map((event) =>
      JSON.stringify({
        timestamp,
        source: "codex-app-server",
        event,
      }),
    )
    .join("\n");

  await mkdir(dirname(filePath), { recursive: true });
  await appendFile(filePath, `${lines}\n`, "utf8");
}

export async function clearGraphEvents(rootPath: string) {
  const filePath = graphEventsPathForRoot(rootPath);

  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, "", "utf8");
}
