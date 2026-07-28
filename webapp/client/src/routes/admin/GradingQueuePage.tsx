import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api, ApiError } from "../../lib/apiClient";
import type { GradingAttemptDetail, GradingQueueItem } from "../../lib/types";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { FullPageSpinner } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";

export function GradingQueuePage() {
  const qc = useQueryClient();
  const queue = useQuery({ queryKey: ["grading", "queue"], queryFn: () => api.get<GradingQueueItem[]>("/grading/queue") });
  const [activeAttemptId, setActiveAttemptId] = useState<number | null>(null);

  const detail = useQuery({
    queryKey: ["grading", "attempt", activeAttemptId],
    queryFn: () => api.get<GradingAttemptDetail>(`/grading/attempts/${activeAttemptId}`),
    enabled: activeAttemptId !== null,
  });

  const grade = useMutation({
    mutationFn: (params: { answerId: number; awardedMarks: number }) =>
      api.put(`/grading/answers/${params.answerId}`, { awardedMarks: params.awardedMarks }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["grading"] });
      toast.success("Saved");
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not save grade"),
  });

  if (queue.isLoading) return <FullPageSpinner />;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Grading Queue</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Attempts with short-answer questions awaiting manual review.</p>
      </div>

      {!queue.data || queue.data.length === 0 ? (
        <EmptyState title="Nothing to grade" description="Attempts with pending short-answer questions will show up here." />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
          <Card className="flex flex-col gap-2 p-3">
            {queue.data.map((item) => (
              <button
                key={item.attemptId}
                onClick={() => setActiveAttemptId(item.attemptId)}
                className={`rounded-xl p-3 text-left text-sm transition ${
                  activeAttemptId === item.attemptId
                    ? "bg-brand-50 dark:bg-brand-900/30"
                    : "hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                <p className="font-medium text-slate-800 dark:text-slate-100">{item.studentName}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{item.testName}</p>
              </button>
            ))}
          </Card>

          <div className="flex flex-col gap-4">
            {!activeAttemptId ? (
              <EmptyState title="Select an attempt" description="Pick a student on the left to grade their short answers." />
            ) : detail.isLoading || !detail.data ? (
              <FullPageSpinner />
            ) : (
              <>
                <Card>
                  <p className="font-semibold text-slate-900 dark:text-white">{detail.data.studentName}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{detail.data.testName}</p>
                </Card>
                {detail.data.answers.map((a) => (
                  <GradeRow key={a.answerId} answer={a} onSave={(marks) => grade.mutate({ answerId: a.answerId, awardedMarks: marks })} saving={grade.isPending} />
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function GradeRow({
  answer,
  onSave,
  saving,
}: {
  answer: GradingAttemptDetail["answers"][number];
  onSave: (marks: number) => void;
  saving: boolean;
}) {
  const [marks, setMarks] = useState(answer.awardedMarks ?? 0);

  return (
    <Card className="flex flex-col gap-3">
      <p className="font-medium text-slate-900 dark:text-white">{answer.text}</p>
      <div className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 dark:border-slate-800 dark:text-slate-200">
        {answer.textResponse || <span className="italic text-slate-400">No answer submitted</span>}
      </div>
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
          Award marks (max {answer.maxMarks})
          <input
            type="number"
            min={0}
            max={answer.maxMarks}
            value={marks}
            onChange={(e) => setMarks(Number(e.target.value))}
            className="w-20 rounded-xl border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </label>
        <Button onClick={() => onSave(marks)} disabled={saving}>
          {answer.awardedMarks !== null ? "Update grade" : "Save grade"}
        </Button>
      </div>
    </Card>
  );
}
