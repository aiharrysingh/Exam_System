import type { Transition, Variants } from "motion/react";

type Bezier = [number, number, number, number];

/** Seconds. Anything in the exam runner must stay at or under `base`. */
export const duration = {
  instant: 0.08,
  fast: 0.12,
  base: 0.18,
  slow: 0.28,
  slower: 0.4,
  celebrate: 0.7,
} as const;

export const ease = {
  /** expo-out — the "premium" curve; fast start, long settle */
  out: [0.16, 1, 0.3, 1] as Bezier,
  inOut: [0.65, 0, 0.35, 1] as Bezier,
  /** exits only */
  in: [0.4, 0, 1, 1] as Bezier,
};

export const spring = {
  snappy: { type: "spring", stiffness: 420, damping: 34, mass: 0.7 },
  gentle: { type: "spring", stiffness: 220, damping: 30 },
  counter: { type: "spring", stiffness: 90, damping: 22 },
} satisfies Record<string, Transition>;

/* ------------------------------------------------------------------ *
 * Named variants — the whole app animates out of these six.
 * ------------------------------------------------------------------ */

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: duration.base, ease: ease.out } },
  exit: { opacity: 0, y: -4, transition: { duration: duration.fast, ease: ease.in } },
};

/** Tightens the stagger as the list grows so long lists don't crawl in. */
export const staggerContainer = (count = 4): Variants => ({
  hidden: {},
  show: {
    transition: {
      staggerChildren: count > 12 ? 0.02 : 0.045,
      delayChildren: 0.04,
    },
  },
});

export const modalPop = {
  backdrop: {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { duration: duration.fast } },
    exit: { opacity: 0, transition: { duration: duration.fast } },
  } satisfies Variants,
  panel: {
    hidden: { opacity: 0, scale: 0.97, y: 8 },
    show: { opacity: 1, scale: 1, y: 0, transition: spring.snappy },
    exit: { opacity: 0, scale: 0.98, y: 4, transition: { duration: duration.fast, ease: ease.in } },
  } satisfies Variants,
};

/**
 * Directional question swap. `custom` is +1 forward / -1 back.
 * HARD CAP: enter 180ms, exit 120ms — a timed exam must never feel sluggish.
 */
export const slideQuestion: Variants = {
  hidden: (d: number) => ({ opacity: 0, x: d * 16 }),
  show: { opacity: 1, x: 0, transition: { duration: duration.base, ease: ease.out } },
  exit: (d: number) => ({
    opacity: 0,
    x: d * -10,
    transition: { duration: duration.fast, ease: ease.in },
  }),
};

export const popIn: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  show: { opacity: 1, scale: 1, transition: spring.snappy },
};

/** For SVG path reveals (checkmarks, rings, sparklines). */
export const drawIn: Variants = {
  hidden: { pathLength: 0, opacity: 0 },
  show: { pathLength: 1, opacity: 1, transition: { duration: 0.5, ease: ease.out } },
};
