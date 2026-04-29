import type { HTMLAttributes } from "react";

type BadgeTone = "neutral" | "success" | "info";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: BadgeTone;
};

const toneClasses: Record<BadgeTone, string> = {
  neutral: "bg-zinc-100 text-zinc-600",
  success: "bg-emerald-50 text-emerald-700",
  info: "bg-sky-50 text-sky-700",
};

function cx(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function Badge({
  className,
  tone = "neutral",
  ...props
}: BadgeProps) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium",
        toneClasses[tone],
        className,
      )}
      {...props}
    />
  );
}
