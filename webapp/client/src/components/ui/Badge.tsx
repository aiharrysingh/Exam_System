import clsx from "clsx";
import { motion } from "motion/react";
import { popIn } from "../../lib/motion";

type Tone = "brand" | "accent" | "success" | "warning" | "danger" | "neutral";
type Size = "sm" | "md";

const tones: Record<Tone, string> = {
  brand: "bg-brand-50 text-brand-700 ring-brand-500/20 dark:bg-brand-500/12 dark:text-brand-300 dark:ring-brand-400/25",
  accent:
    "bg-accent-50 text-accent-700 ring-accent-500/20 dark:bg-accent-500/12 dark:text-accent-300 dark:ring-accent-400/25",
  success:
    "bg-success-50 text-success-700 ring-success-500/20 dark:bg-success-500/12 dark:text-success-500 dark:ring-success-500/25",
  warning:
    "bg-warning-50 text-warning-700 ring-warning-500/20 dark:bg-warning-500/12 dark:text-warning-500 dark:ring-warning-500/25",
  danger:
    "bg-danger-50 text-danger-700 ring-danger-500/20 dark:bg-danger-500/12 dark:text-danger-500 dark:ring-danger-500/25",
  neutral: "bg-surface-3 text-fg-secondary ring-border-default",
};

const dots: Record<Tone, string> = {
  brand: "bg-brand-500",
  accent: "bg-accent-500",
  success: "bg-success-500",
  warning: "bg-warning-500",
  danger: "bg-danger-500",
  neutral: "bg-ink-400",
};

const sizes: Record<Size, string> = {
  sm: "px-2 py-0.5 text-2xs gap-1",
  md: "px-2.5 py-1 text-xs gap-1.5",
};

export function Badge({
  tone = "neutral",
  size = "md",
  dot,
  children,
}: {
  tone?: Tone;
  size?: Size;
  dot?: boolean;
  children: React.ReactNode;
}) {
  return (
    <motion.span
      // Keyed on tone so a state change (e.g. Draft -> Published) re-animates.
      key={tone}
      variants={popIn}
      initial="hidden"
      animate="show"
      className={clsx(
        "inline-flex shrink-0 items-center rounded-full font-semibold ring-1 ring-inset",
        tones[tone],
        sizes[size]
      )}
    >
      {dot && <span className={clsx("h-1.5 w-1.5 rounded-full", dots[tone])} />}
      {children}
    </motion.span>
  );
}
