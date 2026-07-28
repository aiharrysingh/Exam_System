import { useCallback, useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import clsx from "clsx";
import { modalPop } from "../../lib/motion";

type Size = "sm" | "md" | "lg" | "xl";

const sizes: Record<Size, string> = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
};

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

interface Props {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  size?: Size;
  /** Set false for destructive flows that must be resolved by a button. */
  dismissible?: boolean;
  children: ReactNode;
  footer?: ReactNode;
}

/**
 * This component owns its own <AnimatePresence>, so callers must always render
 * it and drive `open` — the `{cond && <Modal/>}` pattern would unmount the tree
 * before the exit animation could run.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  size = "md",
  dismissible = true,
  children,
  footer,
}: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descId = useId();

  // Remember what to give focus back to, before the modal steals it.
  useEffect(() => {
    if (open) restoreRef.current = document.activeElement as HTMLElement | null;
  }, [open]);

  // Scroll lock. Paired with `scrollbar-gutter: stable` on the shell so the
  // page doesn't shift horizontally when the bar disappears.
  useEffect(() => {
    if (!open) return;
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = prev;
    };
  }, [open]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape" && dismissible) {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const nodes = panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (!nodes || nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    },
    [dismissible, onClose]
  );

  return createPortal(
    <AnimatePresence
      onExitComplete={() => {
        restoreRef.current?.focus?.();
        restoreRef.current = null;
      }}
    >
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onKeyDown={handleKeyDown}>
          <motion.div
            variants={modalPop.backdrop}
            initial="hidden"
            animate="show"
            exit="exit"
            onClick={dismissible ? onClose : undefined}
            className="absolute inset-0 bg-scrim backdrop-blur-[2px]"
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={description ? descId : undefined}
            variants={modalPop.panel}
            initial="hidden"
            animate="show"
            exit="exit"
            // Focus only once the panel has actually painted, or assistive tech
            // can lose it.
            onAnimationComplete={(def) => {
              if (def !== "show") return;
              const target = panelRef.current?.querySelector<HTMLElement>(FOCUSABLE);
              (target ?? panelRef.current)?.focus();
            }}
            tabIndex={-1}
            className={clsx(
              "relative flex max-h-[90vh] w-full flex-col overflow-hidden rounded-2xl border border-border-subtle bg-surface-1 shadow-e5 outline-none",
              sizes[size]
            )}
          >
            <div className="flex items-start justify-between gap-4 border-b border-border-subtle px-5 py-4">
              <div className="min-w-0">
                <h2 id={titleId} className="text-lg font-semibold text-fg">
                  {title}
                </h2>
                {description && (
                  <p id={descId} className="mt-0.5 text-xs text-fg-muted">
                    {description}
                  </p>
                )}
              </div>
              {dismissible && (
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close dialog"
                  className="-mr-1 -mt-1 rounded-md p-1.5 text-fg-muted transition-colors hover:bg-surface-3 hover:text-fg"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                </button>
              )}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>

            {footer && (
              <div className="flex items-center justify-end gap-2 border-t border-border-subtle bg-surface-2 px-5 py-3.5">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
