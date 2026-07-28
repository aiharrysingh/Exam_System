import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../lib/apiClient";
import type { InProgressAttempt, ResultListItem, TestSummary } from "../../lib/types";
import { StatCard } from "../../components/ui/StatCard";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { FullPageSpinner } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";

export function DashboardPage() {
  const navigate = useNavigate();
  const tests = useQuery({ queryKey: ["tests"], queryFn: () => api.get<TestSummary[]>("/tests") });
  const inProgress = useQuery({
    queryKey: ["attempts", "in-progress"],
    queryFn: () => api.get<InProgressAttempt[]>("/attempts/in-progress"),
  });
  const results = useQuery({ queryKey: ["results"], queryFn: () => api.get<ResultListItem[]>("/results") });

  if (tests.isLoading || inProgress.isLoading || results.isLoading) return <FullPageSpinner />;

  const completed = results.data ?? [];
  const avgPct = completed.length
    ? Math.round(
        (completed.reduce((sum, r) => sum + (r.totalMarks > 0 ? r.score / r.totalMarks : 0), 0) / completed.length) * 100
      )
    : null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Your exam activity at a glance.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Tests available" value={tests.data?.length ?? 0} icon="📝" gradientIndex={0} />
        <StatCard label="In progress" value={inProgress.data?.length ?? 0} icon="⏳" gradientIndex={1} />
        <StatCard label="Completed" value={completed.length} icon="✅" gradientIndex={2} />
        <StatCard label="Average score" value={avgPct !== null ? `${avgPct}%` : "—"} icon="📈" gradientIndex={3} />
      </div>

      {inProgress.data && inProgress.data.length > 0 && (
        <Card>
          <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-white">Resume where you left off</h2>
          <div className="flex flex-col gap-3">
            {inProgress.data.map((a) => (
              <div
                key={a.attemptId}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-800"
              >
                <div>
                  <p className="font-medium text-slate-800 dark:text-slate-100">{a.testName}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{a.subjectName}</p>
                </div>
                <Button onClick={() => navigate(`/attempts/${a.attemptId}`)}>Resume</Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Available tests</h2>
          <Link to="/tests" className="text-sm font-semibold text-brand-600 dark:text-brand-400">
            View all
          </Link>
        </div>
        {!tests.data || tests.data.length === 0 ? (
          <EmptyState title="No tests available right now" description="Check back later for new tests." />
        ) : (
          <div className="flex flex-col gap-3">
            {tests.data.slice(0, 4).map((t) => (
              <div
                key={t.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-800"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-slate-800 dark:text-slate-100">{t.name}</p>
                    {t.isPractice && <Badge tone="brand">Practice</Badge>}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t.subject.name} · {t.durationMin} min · {t.totalQuestions} questions
                  </p>
                </div>
                <Link to="/tests">
                  <Button variant="secondary">View</Button>
                </Link>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
