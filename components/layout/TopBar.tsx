import { CodexTaskPanel } from "@/components/codex/CodexTaskPanel";
import { PrdInput } from "@/components/prd/PrdInput";

type TopBarProps = {
  prd: string;
  task: string;
  isReplaying: boolean;
  isGeneratingGraph: boolean;
  notice?: string;
  onPrdChange: (value: string) => void;
  onTaskChange: (value: string) => void;
  onGenerateGraph: () => void;
  onRunDemo: () => void;
};

export function TopBar({
  prd,
  task,
  isReplaying,
  isGeneratingGraph,
  notice,
  onPrdChange,
  onTaskChange,
  onGenerateGraph,
  onRunDemo,
}: TopBarProps) {
  return (
    <header className="border-b border-zinc-200 bg-white/92 px-3 py-2 shadow-sm backdrop-blur">
      <div className="flex flex-col gap-2 xl:flex-row xl:items-center">
        <div className="min-w-[180px]">
          <p className="text-xs font-medium uppercase text-zinc-500">
            cocanvas
          </p>
          <h1 className="text-lg font-semibold">
            Live feature canvas
          </h1>
        </div>
        <div className="grid flex-1 grid-cols-1 gap-2 lg:grid-cols-[minmax(150px,0.32fr)_minmax(320px,1fr)_minmax(320px,1fr)]">
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-2">
            <label className="mb-1 block text-xs font-medium text-zinc-500">
              Repo
            </label>
            <div className="truncate text-sm font-medium text-zinc-900">
              /projects/cocanvas
            </div>
            {notice ? (
              <p className="mt-1 truncate text-xs text-zinc-500" title={notice}>
                {notice}
              </p>
            ) : null}
          </div>
          <PrdInput
            value={prd}
            isGenerating={isGeneratingGraph}
            onChange={onPrdChange}
            onGenerate={onGenerateGraph}
          />
          <CodexTaskPanel
            value={task}
            isReplaying={isReplaying}
            onChange={onTaskChange}
            onRunDemo={onRunDemo}
          />
        </div>
      </div>
    </header>
  );
}
