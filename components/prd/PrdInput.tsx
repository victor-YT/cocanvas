type PrdInputProps = {
  value: string;
  isGenerating: boolean;
  onChange: (value: string) => void;
  onGenerate: () => void;
};

export function PrdInput({
  value,
  isGenerating,
  onChange,
  onGenerate,
}: PrdInputProps) {
  return (
    <label className="rounded-lg border border-zinc-200 bg-zinc-50 p-2">
      <span className="mb-1 block text-xs font-medium text-zinc-500">PRD</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-16 w-full resize-none rounded-md bg-white px-3 py-2 text-sm outline-none ring-1 ring-zinc-200 transition focus:ring-zinc-400"
      />
      <button
        type="button"
        disabled={isGenerating || value.trim().length === 0}
        onClick={onGenerate}
        className="mt-2 min-h-9 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-800 shadow-sm transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400"
      >
        {isGenerating ? "Generating..." : "Generate Graph"}
      </button>
    </label>
  );
}
