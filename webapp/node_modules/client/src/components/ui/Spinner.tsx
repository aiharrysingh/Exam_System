import clsx from "clsx";

const sizes = { sm: "h-4 w-4", md: "h-6 w-6", lg: "h-9 w-9" } as const;

export function Spinner({
  size = "md",
  className,
}: {
  size?: keyof typeof sizes;
  className?: string;
}) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={clsx(
        "inline-block animate-spin rounded-full border-2 border-border-default border-t-brand-500",
        sizes[size],
        className
      )}
    />
  );
}

/**
 * @deprecated Prefer a page-shaped <Skeleton/> composition — a centered spinner
 * causes a layout pop when content arrives. Retained only for routes not yet
 * migrated.
 */
export function FullPageSpinner() {
  return (
    <div className="flex h-full min-h-[50vh] items-center justify-center">
      <Spinner size="lg" />
    </div>
  );
}
