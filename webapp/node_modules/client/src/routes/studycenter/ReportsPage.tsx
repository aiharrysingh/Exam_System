import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "../../lib/apiClient";
import type { TestSummary } from "../../lib/types";
import { Card } from "../../components/ui/Card";
import { StatCard } from "../../components/ui/StatCard";
import { FullPageSpinner } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";

interface Stats {
  testId: number;
  totalMarks: number;
  attemptCount: number;
  averageScore: number;
  distribution: { bucket: string; count: number }[];
}

interface AttemptRow {
  attemptId: number;
  studentName: string;
  status: string;
  score: number;
  endTime: string | null;
}

export function ReportsPage() {
  const tests = useQuery({ queryKey: ["tests"], queryFn: () => api.get<TestSummary[]>("/tests") });
  const [testId, setTestId] = useState<number | null>(null);
  const activeTestId = testId ?? tests.data?.[0]?.id ?? null;

  const stats = useQuery({
    queryKey: ["studycenter", "stats", activeTestId],
    queryFn: () => api.get<Stats>(`/studycenter/tests/${activeTestId}/stats`),
    enabled: activeTestId !== null,
  });
  const attempts = useQuery({
    queryKey: ["studycenter", "attempts", activeTestId],
    queryFn: () => api.get<AttemptRow[]>(`/studycenter/attempts?testId=${activeTestId}`),
    enabled: activeTestId !== null,
  });

  if (tests.isLoading) return <FullPageSpinner />;
  if (!tests.data || tests.data.length === 0) {
    return <EmptyState title="No published tests yet" description="Reports will appear once tests have been taken." />;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Reports</h1>
        <select
          value={activeTestId ?? ""}
          onChange={(e) => setTestId(Number(e.target.value))}
          className="rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        >
          {tests.data.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      {stats.data && (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            <StatCard label="Attempts" value={stats.data.attemptCount} icon="✍️" gradientIndex={0} />
            <StatCard label="Average score" value={stats.data.averageScore.toFixed(1)} icon="📈" gradientIndex={1} />
            <StatCard label="Total marks" value={stats.data.totalMarks} icon="🎯" gradientIndex={2} />
          </div>

          <Card>
            <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">Score distribution</h2>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.data.distribution}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-800" />
                  <XAxis dataKey="bucket" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </>
      )}

      {attempts.data && attempts.data.length > 0 && (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-800 dark:text-slate-400">
              <tr>
                <th className="px-5 py-3">Student</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Score</th>
                <th className="px-5 py-3">Finished</th>
              </tr>
            </thead>
            <tbody>
              {attempts.data.map((a) => (
                <tr key={a.attemptId} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
                  <td className="px-5 py-3 font-medium text-slate-800 dark:text-slate-100">{a.studentName}</td>
                  <td className="px-5 py-3 text-slate-500 dark:text-slate-400">{a.status}</td>
                  <td className="px-5 py-3 text-slate-500 dark:text-slate-400">{a.score}</td>
                  <td className="px-5 py-3 text-slate-500 dark:text-slate-400">
                    {a.endTime ? new Date(a.endTime).toLocaleString() : "—"}
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
