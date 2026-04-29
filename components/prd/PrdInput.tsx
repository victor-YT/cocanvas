type PrdInputProps = {
  value: string;
  onChange: (value: string) => void;
};

export function PrdInput({ value, onChange }: PrdInputProps) {
  return (
    <label className="rounded-lg border border-zinc-200 bg-zinc-50 p-2">
      <span className="mb-1 block text-xs font-medium text-zinc-500">PRD</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-16 w-full resize-none bg-transparent text-sm outline-none"
      />
    </label>
  );
}
