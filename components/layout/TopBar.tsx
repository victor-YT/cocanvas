import { CodexTaskPanel } from "@/components/codex/CodexTaskPanel";
import { PrdInput } from "@/components/prd/PrdInput";

type TopBarProps = {
  prd: string;
  task: string;
  isReplaying: boolean;
  onPrdChange: (value: string) => void;
  onTaskChange: (value: string) => void;
  onRunDemo: () => void;
};

export function TopBar({
  prd,
  task,
  isReplaying,
  onPrdChange,
  onTaskChange,
  onRunDemo,
}: TopBarProps) {
  return (
    <header className="border-b border-zinc-200 bg-white/90 px-4 py-3 shadow-sm backdrop-blur">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
        <div className="min-w-[210px]">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">
            cocanvas
          </p>
          <h1 className="text-xl font-semibold tracking-tight">
            Live feature canvas
          </h1>
        </div>
        <div className="grid flex-1 grid-cols-1 gap-3 lg:grid-cols-[1fr_1fr_auto]">
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-2">
            <label className="mb-1 block text-xs font-medium text-zinc-500">
              Repo
            </label>
            <div className="truncate text-sm font-medium">
              /projects/cocanvas
            </div>
          </div>
          <PrdInput value={prd} onChange={onPrdChange} />
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
