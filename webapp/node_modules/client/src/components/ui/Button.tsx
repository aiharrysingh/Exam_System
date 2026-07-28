import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { motion } from "motion/react";
import clsx from "clsx";
import { Spinner } from "./Spinner";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "success" | "subtle";
type Size = "sm" | "md" | "lg";

interface Props extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "ref"> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
}

const variants: Record<Variant, string> = {
  primary:
    "bg-[linear-gradient(160deg,var(--color-brand-600),var(--color-brand-500))] text-white shadow-brand hover:brightness-[1.07] active:brightness-95",
  secondary:
    "bg-surface-1 text-fg border border-border-default shadow-e1 hover:bg-surface-2 hover:border-border-strong",
  ghost: "text-fg-secondary hover:bg-surface-3 hover:text-fg",
  subtle: "bg-brand-50 text-brand-700 hover:bg-brand-100 dark:bg-brand-500/12 dark:text-brand-300 dark:hover:bg-brand-500/20",
  danger: "bg-danger-600 text-white shadow-e2 hover:bg-danger-700",
  success: "bg-success-700 text-white shadow-e2 hover:bg-success-600",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-xs gap-1.5 rounded-md",
  md: "h-10 px-4 text-sm gap-2 rounded-lg",
  lg: "h-11 px-5 text-sm gap-2 rounded-lg",
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = "primary", size = "md", loading = false, iconLeft, iconRight, className, disabled, children, ...props },
  ref
) {
  const isDisabled = disabled || loading;
  return (
    <motion.button
      ref={ref}
      whileTap={isDisabled ? undefined : { scale: 0.97 }}
      whileHover={isDisabled || variant !== "primary" ? undefined : { y: -1 }}
      transition={{ duration: 0.12 }}
      className={clsx(
        "relative inline-flex select-none items-center justify-center font-semibold transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-55 disabled:shadow-none",
        sizes[size],
        variants[variant],
        className
      )}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      {...(props as React.ComponentProps<typeof motion.button>)}
    >
      {/* Label stays mounted but hidden so the button never changes width while loading. */}
      <span className={clsx("inline-flex items-center gap-2", loading && "invisible")}>
        {iconLeft}
        {children}
        {iconRight}
      </span>
      {loading && (
        <span className="absolute inset-0 grid place-items-center">
          <Spinner size="sm" className={variant === "primary" || variant === "danger" || variant === "success" ? "border-white/30 border-t-white" : undefined} />
        </span>
      )}
    </motion.button>
  );
});
