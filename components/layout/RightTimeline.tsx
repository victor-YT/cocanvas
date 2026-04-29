import type { ObservedGraphState } from "@/lib/types/observedGraph";
import { TimelinePanel } from "@/components/timeline/TimelinePanel";

type RightTimelineProps = {
  graph: ObservedGraphState;
  eventCount: number;
  isReplaying: boolean;
};

export function RightTimeline({
  graph,
  eventCount,
  isReplaying,
}: RightTimelineProps) {
  const selectedNode = graph.nodes.find(
    (node) => node.id === graph.selectedNodeId,
  );

  return (
    <aside className="grid min-h-[320px] gap-3 lg:max-h-[calc(100vh-120px)] lg:grid-rows-[1fr_auto]">
      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white/95 shadow-sm">
        <TimelinePanel
          events={graph.timeline}
          eventCount={eventCount}
          isReplaying={isReplaying}
        />
      </div>

      <section className="rounded-2xl border border-zinc-200 bg-white/95 p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">Inspector</h2>
            <p className="text-xs text-zinc-500">
              {selectedNode ? selectedNode.nodeType : "No node selected"}
            </p>
          </div>
        </div>

        {selectedNode ? (
          <div className="mt-4 space-y-3">
            <div>
              <div className="text-sm font-semibold text-zinc-900">
                {selectedNode.title}
              </div>
              <p className="mt-1 text-xs leading-5 text-zinc-500">
                {selectedNode.summary ?? "No summary observed yet."}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg bg-zinc-50 p-2">
                <div className="font-medium text-zinc-500">Status</div>
                <div className="mt-1 font-semibold text-zinc-900">
                  {selectedNode.status.replace("_", " ")}
                </div>
              </div>
              <div className="rounded-lg bg-zinc-50 p-2">
                <div className="font-medium text-zinc-500">Evidence</div>
                <div className="mt-1 font-semibold text-zinc-900">
                  {selectedNode.evidence.length}
                </div>
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold uppercase text-zinc-500">
                Evidence
              </div>
              <div className="mt-2 space-y-2">
                {selectedNode.evidence.length > 0 ? (
                  selectedNode.evidence.map((item) => (
                    <div key={item.id} className="rounded-lg bg-emerald-50 p-2 text-xs">
                      <div className="font-medium text-emerald-900">
                        {item.summary}
                      </div>
                      {item.path ? (
                        <div className="mt-1 truncate text-emerald-700">
                          {item.path}
                        </div>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <div className="rounded-lg bg-zinc-50 p-2 text-xs text-zinc-500">
                    No evidence observed.
                  </div>
                )}
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold uppercase text-zinc-500">
                Risks
              </div>
              <div className="mt-2 space-y-2">
                {selectedNode.risks.length > 0 ? (
                  selectedNode.risks.map((item) => (
                    <div key={item.id} className="rounded-lg bg-rose-50 p-2 text-xs">
                      <div className="font-medium text-rose-900">
                        {item.summary}
                      </div>
                      <div className="mt-1 text-rose-700">
                        Severity: {item.severity}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-lg bg-zinc-50 p-2 text-xs text-zinc-500">
                    No risks observed.
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-4 rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-4 text-sm text-zinc-500">
            Select a canvas node to inspect evidence, risks, files, and raw events.
          </div>
        )}
      </section>
    </aside>
  );
}
