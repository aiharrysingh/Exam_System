import { NavLink, Outlet, useNavigate } from "react-router-dom";
import clsx from "clsx";
import { useCurrentUser, useLogout } from "../../lib/useAuth";
import { Button } from "../ui/Button";
import { FullPageSpinner } from "../ui/Spinner";

const NAV: Record<string, { to: string; label: string; icon: string }[]> = {
  STUDENT: [
    { to: "/dashboard", label: "Dashboard", icon: "🏠" },
    { to: "/tests", label: "Available Tests", icon: "📝" },
    { to: "/results", label: "My Results", icon: "📊" },
    { to: "/profile", label: "Profile", icon: "👤" },
  ],
  ADMIN: [
    { to: "/admin/dashboard", label: "Dashboard", icon: "🏠" },
    { to: "/admin/subjects", label: "Subjects", icon: "📚" },
    { to: "/admin/tests", label: "Tests & Questions", icon: "🗂️" },
  ],
  STUDY_CENTER: [
    { to: "/studycenter/dashboard", label: "Dashboard", icon: "🏠" },
    { to: "/studycenter/students", label: "Students", icon: "🎓" },
    { to: "/studycenter/reports", label: "Reports", icon: "📈" },
  ],
};

const ROLE_LABEL: Record<string, string> = {
  STUDENT: "Student",
  ADMIN: "Administrator",
  STUDY_CENTER: "Study Center",
};

export function AppShell() {
  const { data: user, isLoading } = useCurrentUser();
  const logout = useLogout();
  const navigate = useNavigate();

  if (isLoading) return <FullPageSpinner />;
  if (!user) {
    navigate("/login", { replace: true });
    return null;
  }

  const items = NAV[user.role] ?? [];

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 md:flex">
        <div className="mb-8 flex items-center gap-2 px-1">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-accent-500 font-bold text-white">
            E
          </div>
          <span className="text-lg font-bold text-slate-900 dark:text-white">ExamHub</span>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                clsx(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                  isActive
                    ? "bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                )
              }
            >
              <span>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-slate-200 pt-4 dark:border-slate-800">
          <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{user.name}</p>
          <p className="mb-3 truncate text-xs text-slate-500 dark:text-slate-400">{ROLE_LABEL[user.role]}</p>
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => logout.mutate(undefined, { onSuccess: () => navigate("/login") })}
          >
            Log out
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900 md:hidden">
          <span className="font-bold text-slate-900 dark:text-white">ExamHub</span>
          <Button variant="ghost" onClick={() => logout.mutate(undefined, { onSuccess: () => navigate("/login") })}>
            Log out
          </Button>
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
