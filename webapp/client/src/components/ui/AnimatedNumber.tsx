import { useEffect, useState } from "react";
import { useMotionValue, useSpring, useReducedMotion } from "motion/react";
import { spring } from "../../lib/motion";

interface Props {
  value: number;
  /** e.g. (n) => `${n}%` */
  format?: (n: number) => string;
  decimals?: number;
  className?: string;
}

/**
 * Spins a number up to its value. The animated text is aria-hidden and a static
 * copy carries the real value, so assistive tech never reads a blur of
 * intermediate numbers.
 */
export function AnimatedNumber({ value, format, decimals = 0, className }: Props) {
  const reduce = useReducedMotion();
  const mv = useMotionValue(0);
  const springed = useSpring(mv, spring.counter);
  const [display, setDisplay] = useState(reduce ? value : 0);

  useEffect(() => {
    if (reduce) {
      setDisplay(value);
      return;
    }
    mv.set(value);
  }, [value, mv, reduce]);

  useEffect(() => {
    if (reduce) return;
    return springed.on("change", (v) => setDisplay(v));
  }, [springed, reduce]);

  const rounded = decimals > 0 ? Number(display.toFixed(decimals)) : Math.round(display);
  const text = format ? format(rounded) : rounded.toLocaleString();
  const finalText = format ? format(value) : value.toLocaleString();

  return (
    <span className={className}>
      <span aria-hidden="true" className="tabular-nums">
        {text}
      </span>
      <span className="sr-only">{finalText}</span>
    </span>
  );
}
