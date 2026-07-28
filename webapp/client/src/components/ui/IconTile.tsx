import clsx from "clsx";

export type Tone = "brand" | "accent" | "success" | "warning" | "danger" | "neutral";

/** Single-hue gradients — deliberately not a rainbow; tone carries meaning. */
const tones: Record<Tone, string> = {
  brand: "from-brand-500 to-brand-700 text-white",
  accent: "from-accent-400 to-accent-600 text-white",
  success: "from-success-500 to-success-700 text-white",
  warning: "from-warning-500 to-warning-700 text-white",
  danger: "from-danger-500 to-danger-700 text-white",
  neutral: "from-ink-400 to-ink-600 text-white",
};

const sizes = {
  sm: "h-8 w-8 rounded-md text-sm",
  md: "h-11 w-11 rounded-lg text-lg",
  lg: "h-14 w-14 rounded-xl text-2xl",
} as const;

export function IconTile({
  tone = "brand",
  size = "md",
  children,
  className,
}: {
  tone?: Tone;
  size?: keyof typeof sizes;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={clsx(
        "inline-grid shrink-0 place-items-center bg-gradient-to-br shadow-e2",
        tones[tone],
        sizes[size],
        className
      )}
    >
      {children}
    </span>
  );
}
