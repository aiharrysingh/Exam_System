import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/apiClient";
import { StatCard } from "../../components/ui/StatCard";
import { FullPageSpinner } from "../../components/ui/Spinner";

interface StudentRow {
  id: number;
  name: string;
  _count: { attempts: number };
}

interface AttemptRow {
  attemptId: number;
  score: number;
  status: string;
}

export function StudyCenterDashboardPage() {
  const students = useQuery({
    queryKey: ["studycenter", "students"],
    queryFn: () => api.get<StudentRow[]>("/studycenter/students"),
  });
  const attempts = useQuery({
    queryKey: ["studycenter", "attempts"],
    queryFn: () => api.get<AttemptRow[]>("/studycenter/attempts"),
  });

  if (students.isLoading || attempts.isLoading) return <FullPageSpinner />;

  const totalAttempts = attempts.data?.length ?? 0;
  const activeStudents = students.data?.filter((s) => s._count.attempts > 0).length ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Study Center Dashboard</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Overview of enrolled students and their test activity.</p>
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard label="Enrolled students" value={students.data?.length ?? 0} icon="🎓" gradientIndex={0} />
        <StatCard label="Students with attempts" value={activeStudents} icon="✍️" gradientIndex={1} />
        <StatCard label="Completed attempts" value={totalAttempts} icon="📊" gradientIndex={2} />
      </div>
    </div>
  );
}
