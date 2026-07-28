import { useTheme } from "./useTheme";

/**
 * Recharts takes `fill`/`stroke` as real values, not Tailwind classes, so the
 * chart palette has to live in TS and be keyed on the resolved theme.
 *
 * The ordinal ramp below was produced by the data-viz validator
 * (`validate_palette.js --ordinal`) against each mode's actual chart surface
 * (#ffffff light / #14141c dark). Both modes pass: monotone lightness, adjacent
 * ΔL ≥ 0.06, light-end contrast ≥ 2:1, single hue. Do not hand-edit these steps
 * without re-running the validator.
 */
const LIGHT = {
  surface: "#ffffff",
  grid: "#e9e9f0",
  axis: "#c6c6d3",
  tick: "#6e6e86",
  series: "#5b4bcc",
  seriesMuted: "#c9c9d4",
  flag: "#d92d20",
  reference: "#9a9aab",
  // low band -> high band
  ordinal: ["#978bf0", "#7565e4", "#5b4bcc", "#4a3ca8", "#2e266b"],
};

const DARK = {
  surface: "#14141c",
  grid: "#23232f",
  axis: "#3d3d4e",
  tick: "#7c7c93",
  series: "#978bf0",
  seriesMuted: "#3d3d4e",
  flag: "#f04438",
  reference: "#6e6e86",
  ordinal: ["#4a3ca8", "#5b4bcc", "#7565e4", "#978bf0", "#bbb2f8"],
};

export type ChartTheme = typeof LIGHT;

export function useChartTheme(): ChartTheme & { mode: "light" | "dark" } {
  const { resolved } = useTheme();
  return { ...(resolved === "dark" ? DARK : LIGHT), mode: resolved };
}

/** Below this share-correct an item is flagged for review. */
export const P_VALUE_FLAG = 0.4;
