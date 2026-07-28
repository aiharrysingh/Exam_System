import { useEffect, useState } from "react";
import clsx from "clsx";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={clsx(
        "rounded-md bg-surface-3 bg-[linear-gradient(90deg,transparent,rgb(255_255_255/0.35),transparent)] bg-[length:200%_100%] [animation:shimmer_1.4s_linear_infinite]",
        "motion-reduce:animate-none motion-reduce:bg-none",
        "dark:bg-[linear-gradient(90deg,transparent,rgb(255_255_255/0.06),transparent)]",
        className
      )}
    />
  );
}

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={clsx("flex flex-col gap-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={clsx("h-3.5", i === lines - 1 ? "w-2/3" : "w-full")} />
      ))}
    </div>
  );
}

/**
 * Only report "loading" once it's lasted long enough to be worth showing —
 * stops a fast cache hit from flashing a skeleton for one frame.
 */
export function useDelayedFlag(active: boolean, delayMs = 120) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (!active) {
      setShown(false);
      return;
    }
    const t = setTimeout(() => setShown(true), delayMs);
    return () => clearTimeout(t);
  }, [active, delayMs]);
  return shown;
}

/** Page-shaped placeholders — these keep layout stable instead of popping. */
export function SkeletonStatRow({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 rounded-xl border border-border-subtle bg-surface-1 p-5">
          <Skeleton className="h-11 w-11 rounded-lg" />
          <div className="flex-1">
            <Skeleton className="mb-2 h-6 w-12" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonList({ rows = 4 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center justify-between gap-4 rounded-xl border border-border-subtle bg-surface-1 p-5"
        >
          <div className="flex-1">
            <Skeleton className="mb-2 h-4 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-9 w-24 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonPage({ stats = 0, rows = 4 }: { stats?: number; rows?: number }) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Skeleton className="mb-2 h-7 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      {stats > 0 && <SkeletonStatRow count={stats} />}
      <SkeletonList rows={rows} />
    </div>
  );
}
