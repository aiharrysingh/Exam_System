interface TooltipEntry {
  value?: number | string;
  name?: string;
}

interface Props {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string | number;
  formatter?: (value: number) => string;
  labelFormatter?: (label: string) => string;
}

/**
 * Recharts' default tooltip is hard-coded white with a light border, which is
 * unreadable on a dark surface. This one wears the app's semantic tokens.
 *
 * Typed structurally rather than with recharts' `TooltipProps` — v3 moved
 * `payload`/`label` behind an internal context type that isn't assignable here.
 */
export function ChartTooltip({ active, payload, label, formatter, labelFormatter }: Props) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="rounded-lg border border-border-default bg-surface-1 px-3 py-2 shadow-e4">
      <p className="text-2xs font-semibold uppercase tracking-wider text-fg-muted">
        {labelFormatter ? labelFormatter(String(label)) : String(label)}
      </p>
      {payload.map((entry, i) => (
        <p key={i} className="mt-0.5 text-sm font-semibold tabular-nums text-fg">
          {formatter ? formatter(Number(entry.value)) : String(entry.value)}
        </p>
      ))}
    </div>
  );
}
