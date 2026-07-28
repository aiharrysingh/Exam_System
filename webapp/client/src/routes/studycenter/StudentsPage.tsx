import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/apiClient";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { FullPageSpinner } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";

interface StudentRow {
  id: number;
  name: string;
  email: string;
  city: string | null;
  _count: { attempts: number };
}

export function StudentsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["studycenter", "students"],
    queryFn: () => api.get<StudentRow[]>("/studycenter/students"),
  });

  if (isLoading) return <FullPageSpinner />;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Students</h1>

      {!data || data.length === 0 ? (
        <EmptyState title="No students enrolled yet" />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-800 dark:text-slate-400">
              <tr>
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3">City</th>
                <th className="px-5 py-3">Attempts</th>
              </tr>
            </thead>
            <tbody>
              {data.map((s) => (
                <tr key={s.id} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
                  <td className="px-5 py-3 font-medium text-slate-800 dark:text-slate-100">{s.name}</td>
                  <td className="px-5 py-3 text-slate-500 dark:text-slate-400">{s.email}</td>
                  <td className="px-5 py-3 text-slate-500 dark:text-slate-400">{s.city ?? "—"}</td>
                  <td className="px-5 py-3">
                    <Badge tone={s._count.attempts > 0 ? "brand" : "neutral"}>{s._count.attempts}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
