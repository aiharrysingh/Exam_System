import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../../lib/apiClient";
import type { ResultListItem } from "../../lib/types";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { ProgressBar } from "../../components/ui/ProgressBar";
import { FullPageSpinner } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";

export function ResultsListPage() {
  const { data, isLoading } = useQuery({ queryKey: ["results"], queryFn: () => api.get<ResultListItem[]>("/results") });

  if (isLoading) return <FullPageSpinner />;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">My Results</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Every test you've completed, submitted or expired.</p>
      </div>

      {!data || data.length === 0 ? (
        <EmptyState title="No completed tests yet" description="Results will appear here once you finish a test." />
      ) : (
        <div className="flex flex-col gap-3">
          {data.map((r) => {
            const pct = r.totalMarks > 0 ? Math.round((r.score / r.totalMarks) * 100) : 0;
            return (
              <Link key={r.attemptId} to={`/results/${r.attemptId}`}>
                <Card className="flex flex-wrap items-center justify-between gap-4 transition hover:border-brand-300">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-slate-900 dark:text-white">{r.testName}</p>
                      <Badge tone={r.status === "EXPIRED" ? "warning" : "success"}>
                        {r.status === "EXPIRED" ? "Time expired" : "Submitted"}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{r.subjectName}</p>
                  </div>
                  <div className="w-40">
                    <div className="mb-1 flex justify-between text-sm font-semibold text-slate-700 dark:text-slate-200">
                      <span>
                        {r.score}/{r.totalMarks}
                      </span>
                      <span>{pct}%</span>
                    </div>
                    <ProgressBar value={r.score} max={r.totalMarks} />
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
