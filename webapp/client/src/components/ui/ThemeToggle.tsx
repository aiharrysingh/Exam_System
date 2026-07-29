import clsx from "clsx";
import { useTheme, type ThemePreference } from "../../lib/useTheme";
import { Icon } from "./Icon";

const OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

export function ThemeToggle() {
  const { preference, setPreference } = useTheme();

  return (
    <div
      role="radiogroup"
      aria-label="Color theme"
      className="flex items-center gap-0.5 rounded-lg border border-border-subtle bg-surface-2 p-0.5"
    >
      {OPTIONS.map((opt) => {
        const active = preference === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={opt.label}
            title={opt.label}
            onClick={() => setPreference(opt.value)}
            className={clsx(
              "flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md text-xs font-semibold transition-colors",
              active ? "bg-surface-1 text-fg shadow-e1" : "text-fg-muted hover:text-fg-secondary"
            )}
          >
            <Icon name={opt.value === "light" ? "sun" : "moon"} size={15} strokeWidth={1.8} />
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
