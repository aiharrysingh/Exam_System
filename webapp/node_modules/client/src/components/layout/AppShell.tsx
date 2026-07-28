import { useEffect, useState } from "react";
import { Navigate, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import clsx from "clsx";
import { useCurrentUser, useLogout } from "../../lib/useAuth";
import { duration, ease } from "../../lib/motion";
import { Button } from "../ui/Button";
import { Spinner } from "../ui/Spinner";
import { ThemeToggle } from "../ui/ThemeToggle";
import { PageTransition } from "../ui/PageTransition";
import { Icon, type IconName } from "../ui/Icon";
import { Logo } from "../brand/Logo";

interface NavItem {
  to: string;
  label: string;
  icon: IconName;
}
interface NavGroup {
  heading?: string;
  items: NavItem[];
}

const AUTHORING: NavGroup[] = [
  { items: [{ to: "/manage/dashboard", label: "Dashboard", icon: "dashboard" }] },
  {
    heading: "Content",
    items: [
      { to: "/manage/subjects", label: "Subjects", icon: "book" },
      { to: "/manage/tests", label: "Tests", icon: "list" },
      { to: "/manage/bank", label: "Question Bank", icon: "bank" },
    ],
  },
  {
    heading: "Insight",
    items: [
      { to: "/manage/grading", label: "Grading Queue", icon: "pencil" },
      { to: "/manage/reports", label: "Reports", icon: "chart" },
    ],
  },
];

const NAV: Record<string, NavGroup[]> = {
  STUDENT: [
    { items: [{ to: "/dashboard", label: "Dashboard", icon: "dashboard" }] },
    {
      heading: "Exams",
      items: [
        { to: "/tests", label: "Available Tests", icon: "list" },
        { to: "/results", label: "My Results", icon: "chart" },
      ],
    },
    { heading: "Account", items: [{ to: "/profile", label: "Profile", icon: "user" }] },
  ],
  ADMIN: [
    ...AUTHORING,
    { heading: "Administration", items: [{ to: "/admin/users", label: "Users", icon: "users" }] },
  ],
  STUDY_CENTER: AUTHORING,
};

const ROLE_LABEL: Record<string, string> = {
  STUDENT: "Student",
  ADMIN: "Administrator",
  STUDY_CENTER: "Test Conductor",
};

function NavLinks({ groups, onNavigate }: { groups: NavGroup[]; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-1 flex-col gap-5">
      {groups.map((group, gi) => (
        <div key={group.heading ?? gi} className="flex flex-col gap-0.5">
          {group.heading && (
            <p className="mb-1 px-3 text-2xs font-semibold uppercase tracking-wider text-fg-muted">
              {group.heading}
            </p>
          )}
          {group.items.map((item) => (
            <NavLink key={item.to} to={item.to} onClick={onNavigate} className="group relative">
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span
                      layoutId="nav-active"
                      transition={{ duration: duration.base, ease: ease.out }}
                      className="absolute inset-0 rounded-lg bg-brand-500/10 ring-1 ring-inset ring-brand-500/25"
                    />
                  )}
                  <span
                    className={clsx(
                      "relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      isActive ? "text-fg-brand" : "text-fg-secondary group-hover:text-fg"
                    )}
                  >
                    <Icon name={item.icon} className="shrink-0" />
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      ))}
    </nav>
  );
}

export function AppShell() {
  const { data: user, isLoading } = useCurrentUser();
  const logout = useLogout();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Close the mobile drawer whenever the route changes.
  useEffect(() => setDrawerOpen(false), [pathname]);

  if (isLoading) {
    return (
      <div className="grid h-full place-items-center">
        <Spinner size="lg" />
      </div>
    );
  }
  // Declarative redirect — navigating during render is a React anti-pattern
  // and misbehaves once transitions are involved.
  if (!user) return <Navigate to="/login" replace />;

  const groups = NAV[user.role] ?? [];
  const doLogout = () => logout.mutate(undefined, { onSuccess: () => navigate("/login") });

  const footer = (
    <div className="flex flex-col gap-3 border-t border-border-subtle pt-4">
      <ThemeToggle />
      <div className="flex items-center gap-2.5 px-1">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-500/12 text-xs font-bold text-fg-brand">
          {user.name.slice(0, 2).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-fg">{user.name}</p>
          <p className="truncate text-2xs text-fg-muted">{ROLE_LABEL[user.role]}</p>
        </div>
      </div>
      <Button variant="secondary" size="sm" className="w-full" onClick={doLogout} loading={logout.isPending}>
        Log out
      </Button>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden w-sidebar shrink-0 flex-col overflow-y-auto border-r border-border-subtle bg-surface-1 p-4 md:flex">
        <div className="mb-7 px-1 pt-1">
          <Logo />
        </div>
        <NavLinks groups={groups} />
        {footer}
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: duration.fast }}
              onClick={() => setDrawerOpen(false)}
              className="absolute inset-0 bg-scrim"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: duration.slow, ease: ease.out }}
              className="relative flex h-full w-sidebar flex-col overflow-y-auto border-r border-border-subtle bg-surface-1 p-4"
            >
              <div className="mb-7 flex items-center justify-between px-1 pt-1">
                <Logo />
                <button
                  onClick={() => setDrawerOpen(false)}
                  aria-label="Close menu"
                  className="rounded-md p-1.5 text-fg-muted hover:bg-surface-3 hover:text-fg"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
              <NavLinks groups={groups} onNavigate={() => setDrawerOpen(false)} />
              {footer}
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex shrink-0 items-center justify-between border-b border-border-subtle bg-surface-1 px-4 py-3 md:hidden">
          <button
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
            className="rounded-md p-1.5 text-fg-secondary hover:bg-surface-3"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
          <Logo size="sm" />
          <span className="w-8" />
        </header>

        <main
          data-scroll-container
          className="flex-1 overflow-y-auto [scrollbar-gutter:stable]"
        >
          <div className="mx-auto w-full max-w-page p-4 sm:p-6 lg:p-8">
            <PageTransition>
              <Outlet />
            </PageTransition>
          </div>
        </main>
      </div>
    </div>
  );
}
