import type { ReactNode } from "react";
import { motion } from "motion/react";
import clsx from "clsx";
import { fadeInUp } from "../../lib/motion";
import { IconTile, type Tone } from "./IconTile";

interface Props {
  title: string;
  description?: string;
  icon?: ReactNode;
  tone?: Tone;
  action?: ReactNode;
  variant?: "default" | "compact";
  className?: string;
}

export function EmptyState({
  title,
  description,
  icon = "✦",
  tone = "brand",
  action,
  variant = "default",
  className,
}: Props) {
  return (
    <motion.div
      variants={fadeInUp}
      initial="hidden"
      animate="show"
      className={clsx(
        "flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border-default bg-surface-2 text-center",
        variant === "compact" ? "p-6" : "p-12",
        className
      )}
    >
      <IconTile
        tone={tone}
        size={variant === "compact" ? "md" : "lg"}
        className="[animation:float_3s_ease-in-out_infinite] motion-reduce:animate-none"
      >
        {icon}
      </IconTile>
      <div>
        <p className="text-base font-semibold text-fg">{title}</p>
        {description && <p className="mx-auto mt-1 max-w-sm text-sm text-fg-muted">{description}</p>}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </motion.div>
  );
}
