import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { GraphEvent } from "@/lib/types/observedGraph";

const GRAPH_EVENTS_PATH = ".cocanvas/graph-events.jsonl";

export function graphEventsPath() {
  return resolve(process.cwd(), GRAPH_EVENTS_PATH);
}

export function parseGraphEventLine(line: string): GraphEvent | undefined {
  const trimmed = line.trim();

  if (!trimmed) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(trimmed) as GraphEvent;

    if (
      parsed.type === "node.upsert" ||
      parsed.type === "edge.upsert" ||
      parsed.type === "status.update" ||
      parsed.type === "evidence.add" ||
      parsed.type === "risk.add"
    ) {
      return parsed;
    }
  } catch {
    return undefined;
  }

  return undefined;
}

export async function readGraphEvents(): Promise<GraphEvent[]> {
  try {
    const contents = await readFile(graphEventsPath(), "utf8");
    const events = contents
      .split(/\r?\n/)
      .map(parseGraphEventLine)
      .filter((event): event is GraphEvent => event !== undefined);

    return events;
  } catch {
    return [];
  }
}
