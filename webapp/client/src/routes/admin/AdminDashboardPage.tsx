import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/apiClient";
import type { AdminTest, ManagedUser, Subject } from "../../lib/types";
import { useCurrentUser } from "../../lib/useAuth";
import { StatCard } from "../../components/ui/StatCard";
import { FullPageSpinner } from "../../components/ui/Spinner";

export function AdminDashboardPage() {
  const { data: user } = useCurrentUser();
  const isAdmin = user?.role === "ADMIN";

  const subjects = useQuery({ queryKey: ["subjects"], queryFn: () => api.get<Subject[]>("/subjects") });
  const tests = useQuery({ queryKey: ["admin", "tests"], queryFn: () => api.get<AdminTest[]>("/tests") });
  const students = useQuery({
    queryKey: ["admin", "users", "STUDENT"],
    queryFn: () => api.get<ManagedUser[]>("/admin/users?role=STUDENT"),
    enabled: isAdmin,
  });

  if (subjects.isLoading || tests.isLoading || (isAdmin && students.isLoading)) return <FullPageSpinner />;

  const published = tests.data?.filter((t) => t.isPublished).length ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {isAdmin ? "Platform-wide subjects, tests, and accounts." : "Your subjects, tests, and questions."}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Subjects" value={subjects.data?.length ?? 0} icon="📚" gradientIndex={0} />
        <StatCard label="Total tests" value={tests.data?.length ?? 0} icon="🗂️" gradientIndex={1} />
        <StatCard label="Published tests" value={published} icon="✅" gradientIndex={2} />
        {isAdmin && <StatCard label="Students" value={students.data?.length ?? 0} icon="🎓" gradientIndex={3} />}
      </div>
    </div>
  );
}
