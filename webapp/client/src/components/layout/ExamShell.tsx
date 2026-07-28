import type { ReactNode } from "react";
import { ExamTimer } from "../ui/ExamTimer";
import { ProgressBar } from "../ui/ProgressBar";
import { LogoMark } from "../brand/Logo";

/**
 * Chrome for the exam-taking routes. The timer lives HERE rather than inside
 * the page, so navigating runner <-> summary never unmounts it — a remount
 * would re-seed the clock-skew ref from a possibly stale `serverNow`.
 */
export function ExamShell({
  testName,
  answered,
  total,
  currentOrder,
  deadline,
  serverNow,
  totalMs,
  onExpire,
  saving,
  children,
}: {
  testName: string;
  answered: number;
  total: number;
  currentOrder?: number;
  deadline: string;
  serverNow: string;
  totalMs?: number;
  onExpire: () => void;
  saving?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-canvas">
      <header className="shrink-0 border-b border-border-subtle bg-surface-1/80 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-4xl items-center gap-4 px-4 py-3 sm:px-6">
          <LogoMark size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-fg">{testName}</p>
            <p className="text-2xs text-fg-muted">
              {currentOrder ? `Question ${currentOrder} of ${total}` : `${total} questions`} · {answered} answered
              {saving && <span className="ml-1.5 text-fg-brand">· Saving…</span>}
            </p>
          </div>
          <ExamTimer deadline={deadline} serverNow={serverNow} totalMs={totalMs} onExpire={onExpire} />
        </div>
        <ProgressBar value={answered} max={total} size="sm" className="rounded-none" />
      </header>

      <main data-scroll-container className="flex-1 overflow-y-auto [scrollbar-gutter:stable]">
        <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6">{children}</div>
      </main>
    </div>
  );
}
