import clsx from "clsx";

const sizes = {
  sm: { box: "h-7 w-7 rounded-md", text: "text-sm", svg: 14 },
  md: { box: "h-9 w-9 rounded-lg", text: "text-lg", svg: 18 },
  lg: { box: "h-12 w-12 rounded-xl", text: "text-2xl", svg: 24 },
} as const;

/** The mark: a rounded square with a checked-answer glyph. */
export function LogoMark({ size = "md", className }: { size?: keyof typeof sizes; className?: string }) {
  const s = sizes[size];
  return (
    <span
      aria-hidden="true"
      className={clsx(
        "grid shrink-0 place-items-center bg-[linear-gradient(140deg,var(--color-brand-500),var(--color-brand-700))] text-white shadow-brand",
        s.box,
        className
      )}
    >
      <svg width={s.svg} height={s.svg} viewBox="0 0 24 24" fill="none">
        <path
          d="M5 12.5l4.2 4.2L19 7"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

export function Logo({
  size = "md",
  showWordmark = true,
  className,
}: {
  size?: keyof typeof sizes;
  showWordmark?: boolean;
  className?: string;
}) {
  return (
    <span className={clsx("inline-flex items-center gap-2.5", className)}>
      <LogoMark size={size} />
      {showWordmark && (
        <span className={clsx("font-bold tracking-tight text-fg", sizes[size].text)}>ExamHub</span>
      )}
    </span>
  );
}
