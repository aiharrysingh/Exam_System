import clsx from "clsx";
import { useTheme, type ThemePreference } from "../../lib/useTheme";

const OPTIONS: { value: ThemePreference; label: string; icon: string }[] = [
  { value: "light", label: "Light", icon: "☀" },
  { value: "system", label: "System", icon: "◐" },
  { value: "dark", label: "Dark", icon: "☾" },
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
              "flex h-7 flex-1 items-center justify-center rounded-md text-sm transition-colors",
              active
                ? "bg-surface-1 text-fg shadow-e1"
                : "text-fg-muted hover:text-fg-secondary"
            )}
          >
            <span aria-hidden="true">{opt.icon}</span>
          </button>
        );
      })}
    </div>
  );
}
