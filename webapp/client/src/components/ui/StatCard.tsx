import type { ReactNode } from "react";
import { motion } from "motion/react";
import clsx from "clsx";
import { fadeInUp } from "../../lib/motion";
import { AnimatedNumber } from "./AnimatedNumber";
import { IconTile, type Tone } from "./IconTile";

interface Props {
  label: string;
  /** Numbers spin up; strings render as-is. */
  value: number | string;
  icon?: ReactNode;
  tone?: Tone;
  format?: (n: number) => string;
  hint?: string;
  className?: string;
}

export function StatCard({ label, value, icon, tone = "brand", format, hint, className }: Props) {
  return (
    <motion.div
      variants={fadeInUp}
      className={clsx(
        "flex items-center gap-4 rounded-xl border border-border-subtle bg-surface-1 p-5 shadow-e2",
        className
      )}
    >
      {icon && (
        <IconTile tone={tone} size="md">
          {icon}
        </IconTile>
      )}
      <div className="min-w-0">
        <p className="text-2xl font-bold tracking-tight text-fg">
          {typeof value === "number" ? <AnimatedNumber value={value} format={format} /> : value}
        </p>
        <p className="truncate text-sm text-fg-muted">{label}</p>
        {hint && <p className="mt-0.5 truncate text-2xs text-fg-muted">{hint}</p>}
      </div>
    </motion.div>
  );
}
