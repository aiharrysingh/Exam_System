import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/apiClient";
import type { AdminTest, Subject } from "../../lib/types";
import { StatCard } from "../../components/ui/StatCard";
import { FullPageSpinner } from "../../components/ui/Spinner";

export function AdminDashboardPage() {
  const subjects = useQuery({ queryKey: ["subjects"], queryFn: () => api.get<Subject[]>("/subjects") });
  const tests = useQuery({ queryKey: ["admin", "tests"], queryFn: () => api.get<AdminTest[]>("/tests") });
  const students = useQuery({
    queryKey: ["studycenter", "students"],
    queryFn: () => api.get<unknown[]>("/studycenter/students"),
  });

  if (subjects.isLoading || tests.isLoading || students.isLoading) return <FullPageSpinner />;

  const published = tests.data?.filter((t) => t.isPublished).length ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Admin Dashboard</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Manage subjects, tests, and questions.</p>
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Subjects" value={subjects.data?.length ?? 0} icon="📚" gradientIndex={0} />
        <StatCard label="Total tests" value={tests.data?.length ?? 0} icon="🗂️" gradientIndex={1} />
        <StatCard label="Published tests" value={published} icon="✅" gradientIndex={2} />
        <StatCard label="Students" value={students.data?.length ?? 0} icon="🎓" gradientIndex={3} />
      </div>
    </div>
  );
}
