import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { api, ApiError } from "../../lib/apiClient";
import type { TestSummary } from "../../lib/types";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { FullPageSpinner } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";

export function TestsPage() {
  const { data: tests, isLoading } = useQuery({ queryKey: ["tests"], queryFn: () => api.get<TestSummary[]>("/tests") });
  const [activeTest, setActiveTest] = useState<TestSummary | null>(null);

  if (isLoading) return <FullPageSpinner />;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Available Tests</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Tests you haven't attempted yet, within their availability window.</p>
      </div>

      {!tests || tests.length === 0 ? (
        <EmptyState title="Nothing to take right now" description="New tests will show up here once published." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tests.map((t) => (
            <Card key={t.id} className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-slate-900 dark:text-white">{t.name}</h3>
                {t.isPractice && <Badge tone="brand">Practice</Badge>}
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">{t.description}</p>
              <div className="flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
                <Badge tone="neutral">{t.subject.name}</Badge>
                <Badge tone="neutral">{t.durationMin} min</Badge>
                <Badge tone="neutral">{t.totalQuestions} questions</Badge>
              </div>
              <Button onClick={() => setActiveTest(t)} className="mt-2">
                Start test
              </Button>
            </Card>
          ))}
        </div>
      )}

      {activeTest && <StartTestModal test={activeTest} onClose={() => setActiveTest(null)} />}
    </div>
  );
}

function StartTestModal({ test, onClose }: { test: TestSummary; onClose: () => void }) {
  const [code, setCode] = useState("");
  const navigate = useNavigate();
  const qc = useQueryClient();

  const start = useMutation({
    mutationFn: () => api.post<{ attemptId: number }>(`/tests/${test.id}/start`, { code }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["tests"] });
      qc.invalidateQueries({ queryKey: ["attempts", "in-progress"] });
      navigate(`/attempts/${res.attemptId}`);
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not start test"),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <Card className="w-full max-w-sm">
        <h2 className="mb-1 text-lg font-semibold text-slate-900 dark:text-white">Start "{test.name}"</h2>
        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
          Enter the test code given by your instructor. Once started, the {test.durationMin}-minute timer cannot be paused.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            start.mutate();
          }}
          className="flex flex-col gap-4"
        >
          <input
            autoFocus
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Test code"
            className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={start.isPending}>
              {start.isPending ? "Starting..." : "Start"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
