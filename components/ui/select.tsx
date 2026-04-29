import type { SelectHTMLAttributes } from "react";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
};

function cx(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function Select({ className, id, label, children, ...props }: SelectProps) {
  const selectId = id ?? label.toLowerCase().replaceAll(" ", "-");

  return (
    <label htmlFor={selectId} className="grid gap-1">
      <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </span>
      <select
        id={selectId}
        className={cx(
          "h-9 rounded-md border border-zinc-200 bg-white px-2.5 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200",
          className,
        )}
        {...props}
      >
        {children}
      </select>
    </label>
  );
}
