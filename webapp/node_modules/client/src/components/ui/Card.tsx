import type { HTMLAttributes } from "react";
import clsx from "clsx";

type Tone = "default" | "glass" | "inset";
type Padding = "none" | "sm" | "md" | "lg";

interface Props extends HTMLAttributes<HTMLDivElement> {
  tone?: Tone;
  padding?: Padding;
  /** Adds a hover lift. Use only when the whole card is a link/button. */
  interactive?: boolean;
}

const tones: Record<Tone, string> = {
  default: "bg-surface-1 border border-border-subtle shadow-e2",
  glass: "bg-surface-1/80 backdrop-blur-md border border-border-subtle shadow-e3",
  inset: "bg-surface-2 border border-border-subtle",
};

const paddings: Record<Padding, string> = {
  none: "",
  sm: "p-3",
  md: "p-5",
  lg: "p-6 sm:p-7",
};

export function Card({ tone = "default", padding = "md", interactive, className, ...props }: Props) {
  return (
    <div
      className={clsx(
        "rounded-xl",
        tones[tone],
        paddings[padding],
        // Plain CSS — a hover lift doesn't warrant a motion component, and this
        // keeps Card usable as a normal div with normal DOM props.
        interactive &&
          "cursor-pointer transition-[transform,box-shadow] duration-150 ease-out hover:-translate-y-0.5 hover:shadow-e3 motion-reduce:hover:translate-y-0",
        className
      )}
      {...props}
    />
  );
}
