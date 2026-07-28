import type { SVGProps } from "react";

/**
 * Small 24x24 stroked icon set. Deliberately hand-rolled rather than pulling an
 * icon package — we need ~14 glyphs and this keeps the bundle flat.
 */
export type IconName =
  | "dashboard"
  | "book"
  | "list"
  | "bank"
  | "pencil"
  | "chart"
  | "users"
  | "user"
  | "check"
  | "clock"
  | "trophy"
  | "plus"
  | "upload"
  | "grip"
  | "inbox";

const paths: Record<IconName, React.ReactNode> = {
  dashboard: (
    <>
      <rect x="3" y="3" width="7.5" height="7.5" rx="1.6" />
      <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.6" />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.6" />
      <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.6" />
    </>
  ),
  book: (
    <>
      <path d="M4 5.5A1.5 1.5 0 015.5 4H19v16H5.5A1.5 1.5 0 014 18.5v-13z" />
      <path d="M8 4v16" />
    </>
  ),
  list: (
    <>
      <path d="M4 5.5h16M4 12h16M4 18.5h10" />
    </>
  ),
  bank: (
    <>
      <path d="M12 3l8 4.5-8 4.5-8-4.5L12 3z" />
      <path d="M4 12.5l8 4.5 8-4.5" />
      <path d="M4 17l8 4.5 8-4.5" />
    </>
  ),
  pencil: (
    <>
      <path d="M4 20h4l10-10a2.5 2.5 0 10-3.5-3.5L4.5 16.5 4 20z" />
    </>
  ),
  chart: (
    <>
      <path d="M4 20V4" />
      <path d="M4 20h16" />
      <path d="M8 16v-4M13 16V8M18 16v-6" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 20a6 6 0 0112 0" />
      <path d="M16 5.5a3.2 3.2 0 010 6.2M17.5 20a6 6 0 00-2.2-4.6" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="3.4" />
      <path d="M5 20a7 7 0 0114 0" />
    </>
  ),
  check: (
    <>
      <path d="M5 12.5l4.2 4.2L19 7" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7v5.2l3.2 2" />
    </>
  ),
  trophy: (
    <>
      <path d="M7 4h10v5a5 5 0 01-10 0V4z" />
      <path d="M7 6H4.5v1A3.5 3.5 0 007.6 10.5M17 6h2.5v1a3.5 3.5 0 01-3.1 3.5" />
      <path d="M12 14v3M9 20h6" />
    </>
  ),
  plus: (
    <>
      <path d="M12 5v14M5 12h14" />
    </>
  ),
  upload: (
    <>
      <path d="M12 16V4" />
      <path d="M7.5 8.5L12 4l4.5 4.5" />
      <path d="M4 16v2.5A1.5 1.5 0 005.5 20h13a1.5 1.5 0 001.5-1.5V16" />
    </>
  ),
  grip: (
    <>
      <circle cx="9" cy="6" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="15" cy="6" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="9" cy="12" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="15" cy="12" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="9" cy="18" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="15" cy="18" r="1.3" fill="currentColor" stroke="none" />
    </>
  ),
  inbox: (
    <>
      <path d="M4 13h4l1.5 3h5L16 13h4" />
      <path d="M5.5 5h13l1.5 8v4.5A1.5 1.5 0 0118.5 19h-13A1.5 1.5 0 014 17.5V13l1.5-8z" />
    </>
  ),
};

interface Props extends Omit<SVGProps<SVGSVGElement>, "name"> {
  name: IconName;
  size?: number;
}

export function Icon({ name, size = 18, strokeWidth = 1.7, ...props }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {paths[name]}
    </svg>
  );
}
