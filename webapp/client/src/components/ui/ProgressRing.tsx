import { motion } from "motion/react";
import clsx from "clsx";
import { spring } from "../../lib/motion";

type Tone = "brand" | "success" | "warning" | "danger";

const strokes: Record<Tone, string> = {
  brand: "var(--color-brand-500)",
  success: "var(--color-success-500)",
  warning: "var(--color-warning-500)",
  danger: "var(--color-danger-500)",
};

interface Props {
  value: number;
  max?: number;
  size?: number;
  stroke?: number;
  tone?: Tone;
  className?: string;
  children?: React.ReactNode;
}

export function ProgressRing({
  value,
  max = 100,
  size = 120,
  stroke = 10,
  tone = "brand",
  className,
  children,
}: Props) {
  const pct = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;

  return (
    <div className={clsx("relative inline-grid place-items-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--border-subtle)"
          strokeWidth={stroke}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={strokes[tone]}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c - pct * c }}
          transition={spring.gentle}
        />
      </svg>
      {children && <div className="absolute inset-0 grid place-items-center">{children}</div>}
    </div>
  );
}
