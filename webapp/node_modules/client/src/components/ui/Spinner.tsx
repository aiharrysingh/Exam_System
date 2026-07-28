export function Spinner({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <div
      className={`animate-spin rounded-full border-2 border-slate-200 border-t-brand-600 dark:border-slate-700 dark:border-t-brand-400 ${className}`}
    />
  );
}

export function FullPageSpinner() {
  return (
    <div className="flex h-full min-h-[50vh] items-center justify-center">
      <Spinner className="h-10 w-10" />
    </div>
  );
}
