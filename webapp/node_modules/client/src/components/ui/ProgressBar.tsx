import { motion } from "motion/react";
import clsx from "clsx";
import { spring } from "../../lib/motion";

type Tone = "brand" | "success" | "warning" | "danger";

const fills: Record<Tone, string> = {
  brand: "bg-gradient-to-r from-brand-500 to-brand-600",
  success: "bg-success-500",
  warning: "bg-warning-500",
  danger: "bg-danger-500",
};

const sizes = { sm: "h-1.5", md: "h-2", lg: "h-2.5" } as const;

export function ProgressBar({
  value,
  max,
  tone = "brand",
  size = "md",
  className,
}: {
  value: number;
  max: number;
  tone?: Tone;
  size?: keyof typeof sizes;
  className?: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={clsx("w-full overflow-hidden rounded-full bg-surface-3", sizes[size], className)}
    >
      <motion.div
        className={clsx("h-full rounded-full", fills[tone])}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={spring.gentle}
      />
    </div>
  );
}
