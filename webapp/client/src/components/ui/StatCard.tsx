import { ReactNode } from "react";
import clsx from "clsx";
import { Card } from "./Card";

const gradients = [
  "from-violet-500 to-fuchsia-500",
  "from-cyan-500 to-blue-500",
  "from-amber-500 to-orange-500",
  "from-emerald-500 to-teal-500",
];

export function StatCard({
  label,
  value,
  icon,
  gradientIndex = 0,
}: {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  gradientIndex?: number;
}) {
  return (
    <Card className="flex items-center gap-4">
      <div
        className={clsx(
          "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white text-xl",
          gradients[gradientIndex % gradients.length]
        )}
      >
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
        <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
      </div>
    </Card>
  );
}
