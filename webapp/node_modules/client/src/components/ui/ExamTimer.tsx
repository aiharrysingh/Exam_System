import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import clsx from "clsx";

interface Props {
  deadline: string;
  serverNow: string;
  onExpire: () => void;
  /** Full allotted time, used only for the ring's fraction. */
  totalMs?: number;
}

/** Seconds remaining at which we announce once to assistive tech. */
const ANNOUNCE_AT = [300, 60, 30, 10];

/**
 * Purely a display. The server is the only thing that actually closes out an
 * attempt for running out of time (see ensureActiveOrFinalize on the API) —
 * this just tells the student when to expect it and nudges a submit call
 * when it hits zero, in case no other request would happen to trigger it.
 *
 * The skew/interval/expiry logic below is deliberately plain state, never a
 * spring or animated value: a lagging interpolation would display a WRONG time
 * on a proctored exam. Every visual state derives from `remainingMs` in render.
 */
export function ExamTimer({ deadline, serverNow, onExpire, totalMs }: Props) {
  const skewRef = useRef(new Date(serverNow).getTime() - Date.now());
  const [remainingMs, setRemainingMs] = useState(() => new Date(deadline).getTime() - new Date(serverNow).getTime());
  const expiredRef = useRef(false);

  useEffect(() => {
    const deadlineMs = new Date(deadline).getTime();
    const tick = () => {
      const correctedNow = Date.now() + skewRef.current;
      const remaining = deadlineMs - correctedNow;
      setRemainingMs(remaining);
      if (remaining <= 0 && !expiredRef.current) {
        expiredRef.current = true;
        onExpire();
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [deadline, onExpire]);

  const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");

  const isCritical = totalSeconds <= 60;
  const isWarning = totalSeconds <= 300;
  const isFinal = totalSeconds <= 10;

  // Announce only at thresholds. The previous `aria-live="polite"` on the digits
  // made screen readers read the clock aloud once per second.
  const announcedRef = useRef<number | null>(null);
  const [announcement, setAnnouncement] = useState("");
  useEffect(() => {
    const hit = ANNOUNCE_AT.find((t) => totalSeconds <= t && (announcedRef.current === null || t < announcedRef.current));
    if (hit !== undefined) {
      announcedRef.current = hit;
      setAnnouncement(hit >= 60 ? `${hit / 60} minute${hit === 60 ? "" : "s"} remaining` : `${hit} seconds remaining`);
    }
  }, [totalSeconds]);

  const fraction = totalMs && totalMs > 0 ? Math.min(1, Math.max(0, remainingMs / totalMs)) : null;
  const R = 13;
  const C = 2 * Math.PI * R;

  const tone = isCritical
    ? { text: "text-danger-600 dark:text-danger-500", ring: "var(--color-danger-500)", border: "border-danger-500/40 bg-danger-50 dark:bg-danger-500/10" }
    : isWarning
      ? { text: "text-warning-700 dark:text-warning-500", ring: "var(--color-warning-500)", border: "border-warning-500/40 bg-warning-50 dark:bg-warning-500/10" }
      : { text: "text-success-700 dark:text-success-500", ring: "var(--color-success-500)", border: "border-success-500/30 bg-success-50 dark:bg-success-500/10" };

  return (
    <div
      className={clsx("flex items-center gap-2.5 rounded-lg border px-3 py-1.5", tone.border)}
      role="timer"
      // Digits are NOT a live region — see the threshold announcer below.
      aria-live="off"
    >
      {fraction !== null && (
        <span
          className={clsx("relative grid h-8 w-8 place-items-center", isCritical && "[animation:pulse-ring_2s_ease-in-out_infinite] motion-reduce:animate-none")}
          aria-hidden="true"
        >
          <svg width="32" height="32" viewBox="0 0 32 32" className="-rotate-90">
            <circle cx="16" cy="16" r={R} fill="none" stroke="var(--border-default)" strokeWidth="3" />
            <circle
              cx="16"
              cy="16"
              r={R}
              fill="none"
              stroke={tone.ring}
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={C - fraction * C}
            />
          </svg>
        </span>
      )}

      {/* The digits never pulse or scale — legibility beats drama on a timed exam.
          Only the final 10s gets a subtle tick, and reduced motion drops it. */}
      <motion.span
        key={isFinal ? totalSeconds : "steady"}
        initial={isFinal ? { scale: 1.06 } : false}
        animate={{ scale: 1 }}
        transition={{ duration: 0.15 }}
        className={clsx("font-mono text-base font-bold tabular-nums leading-none", tone.text)}
      >
        {h > 0 && `${pad(h)}:`}
        {pad(m)}:{pad(s)}
      </motion.span>

      <span className="sr-only" aria-live="polite">
        {announcement}
      </span>
    </div>
  );
}
