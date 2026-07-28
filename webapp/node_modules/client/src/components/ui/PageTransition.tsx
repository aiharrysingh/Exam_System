import { useCallback } from "react";
import { useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { duration, ease } from "../../lib/motion";

/**
 * Route-level crossfade. `mode="wait"` keeps exactly one page mounted, so the
 * shell never gets a double scrollbar.
 *
 * The incoming page resets the scroll container itself: when the outgoing page
 * unmounts, its height collapse can clamp the container's scrollTop, leaving
 * the new page rendered mid-scroll.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();

  const resetScroll = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    node.closest("[data-scroll-container]")?.scrollTo({ top: 0 });
  }, []);

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        ref={resetScroll}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0, transition: { duration: duration.base, ease: ease.out } }}
        exit={{ opacity: 0, transition: { duration: 0.1, ease: ease.in } }}
        className="min-h-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
