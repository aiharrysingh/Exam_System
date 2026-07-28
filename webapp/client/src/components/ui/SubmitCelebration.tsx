import { motion, useReducedMotion } from "motion/react";
import { ease } from "../../lib/motion";

/**
 * Shown for ~900ms between submitting and landing on the results page.
 *
 * It must never gate navigation — the caller drives its own timeout and also
 * navigates immediately on click or under reduced motion. This is decoration
 * over an already-completed request, not a step in the flow.
 */
export function SubmitCelebration({ onSkip }: { onSkip: () => void }) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      role="status"
      aria-live="polite"
      onClick={onSkip}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-50 grid cursor-pointer place-items-center bg-canvas/95 backdrop-blur-sm"
    >
      <div className="flex flex-col items-center gap-5 text-center">
        <div className="relative grid h-28 w-28 place-items-center">
          {!reduce && (
            <motion.span
              className="absolute inset-0 rounded-full bg-success-500/15"
              initial={{ scale: 0.6, opacity: 0.9 }}
              animate={{ scale: 1.5, opacity: 0 }}
              transition={{ duration: 0.9, ease: ease.out }}
            />
          )}
          <svg width="92" height="92" viewBox="0 0 92 92" aria-hidden="true">
            <motion.circle
              cx="46"
              cy="46"
              r="40"
              fill="none"
              stroke="var(--color-success-500)"
              strokeWidth="4"
              strokeLinecap="round"
              initial={reduce ? { pathLength: 1 } : { pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.5, ease: ease.out }}
              transform="rotate(-90 46 46)"
            />
            <motion.path
              d="M30 47.5l11 11L63 35"
              fill="none"
              stroke="var(--color-success-500)"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={reduce ? { pathLength: 1 } : { pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.32, ease: ease.out, delay: reduce ? 0 : 0.34 }}
            />
          </svg>
        </div>
        <div>
          <p className="text-xl font-bold tracking-tight text-fg">Test submitted</p>
          <p className="mt-1 text-sm text-fg-muted">Taking you to your results…</p>
        </div>
      </div>
    </motion.div>
  );
}
