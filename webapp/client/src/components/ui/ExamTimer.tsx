import { useEffect, useRef, useState } from "react";
import clsx from "clsx";

interface Props {
  deadline: string;
  serverNow: string;
  onExpire: () => void;
}

/**
 * Purely a display. The server is the only thing that actually closes out an
 * attempt for running out of time (see ensureActiveOrFinalize on the API) —
 * this just tells the student when to expect it and nudges a submit call
 * when it hits zero, in case no other request would happen to trigger it.
 */
export function ExamTimer({ deadline, serverNow, onExpire }: Props) {
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

  const isLow = totalSeconds <= 60;
  const isMed = totalSeconds <= 300;

  return (
    <div
      className={clsx(
        "flex items-center gap-2 rounded-xl border px-4 py-2 font-mono text-lg font-bold tabular-nums",
        isLow
          ? "border-rose-300 bg-rose-50 text-rose-600 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-400"
          : isMed
            ? "border-amber-300 bg-amber-50 text-amber-600 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-400"
            : "border-emerald-300 bg-emerald-50 text-emerald-600 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-400"
      )}
      role="timer"
      aria-live="polite"
    >
      {h > 0 && <span>{pad(h)}:</span>}
      <span>
        {pad(m)}:{pad(s)}
      </span>
    </div>
  );
}
