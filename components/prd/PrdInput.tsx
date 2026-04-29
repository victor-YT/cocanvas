import { Button } from "@/components/ui/button";

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
    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-2">
      <label
        htmlFor="prd-input"
        className="mb-1 block text-xs font-medium text-zinc-500"
      >
        PRD
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <textarea
          id="prd-input"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-10 min-w-0 flex-1 resize-none rounded-md bg-white px-3 py-2 text-sm outline-none ring-1 ring-zinc-200 transition focus:ring-zinc-400"
        />
        <Button
          type="button"
          size="md"
          disabled={isGenerating || value.trim().length === 0}
          onClick={onGenerate}
          className="sm:min-w-[118px]"
        >
          {isGenerating ? "Generating" : "Generate"}
        </Button>
      </div>
    </div>
  );
}
