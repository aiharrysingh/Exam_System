import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import clsx from "clsx";
import { api } from "../../lib/apiClient";
import type { ResultDetail } from "../../lib/types";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { ProgressBar } from "../../components/ui/ProgressBar";
import { FullPageSpinner } from "../../components/ui/Spinner";

export function ResultDetailPage() {
  const { attemptId } = useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["results", attemptId],
    queryFn: () => api.get<ResultDetail>(`/results/${attemptId}`),
  });

  if (isLoading || !data) return <FullPageSpinner />;
  const pct = data.totalMarks > 0 ? Math.round((data.score / data.totalMarks) * 100) : 0;

  return (
    <div className="flex flex-col gap-6">
      <Card className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">{data.testName}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{data.subjectName}</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <Badge tone={data.status === "EXPIRED" ? "warning" : "success"}>
            {data.status === "EXPIRED" ? "Time expired" : "Submitted"}
          </Badge>
          {data.gradingStatus === "PENDING_REVIEW" && <Badge tone="warning">Pending review</Badge>}
          <div className="w-48">
            <div className="mb-1 flex justify-between text-sm font-semibold text-slate-700 dark:text-slate-200">
              <span>
                {data.score}/{data.totalMarks}
              </span>
              <span>{pct}%</span>
            </div>
            <ProgressBar value={data.score} max={data.totalMarks} />
          </div>
          <a href={`/api/results/${attemptId}/certificate`} target="_blank" rel="noreferrer">
            <Button variant="secondary">Download certificate</Button>
          </a>
        </div>
      </Card>

      {data.gradingStatus === "PENDING_REVIEW" && (
        <Card className="border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
          <p className="text-sm text-amber-800 dark:text-amber-300">
            One or more short-answer questions are still awaiting manual review — your score above may change once grading is complete.
          </p>
        </Card>
      )}

      <div className="flex flex-col gap-4">
        {data.questions.map((q, i) => (
          <Card key={q.questionId} className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
              <p className="font-medium text-slate-900 dark:text-white">
                {i + 1}. {q.text}
              </p>
              <Badge tone={q.awarded === null ? "warning" : q.awarded > 0 ? "success" : "danger"}>
                {q.awarded === null ? "Pending" : `${q.awarded}/${q.marks}`}
              </Badge>
            </div>

            {q.type === "SHORT_ANSWER" ? (
              <div className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 dark:border-slate-800 dark:text-slate-200">
                {q.textResponse || <span className="italic text-slate-400">Not answered</span>}
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {q.options.map((opt) => {
                  const isSelected = q.selectedOptionIds.includes(opt.id);
                  const isCorrect = opt.isCorrect;
                  return (
                    <div
                      key={opt.id}
                      className={clsx(
                        "rounded-lg border px-3 py-2 text-sm",
                        isCorrect && "border-emerald-400 bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
                        isSelected && !isCorrect && "border-rose-400 bg-rose-50 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
                        !isSelected && !isCorrect && "border-slate-200 text-slate-600 dark:border-slate-800 dark:text-slate-300"
                      )}
                    >
                      {opt.text}
                      {isSelected && <span className="ml-2 text-xs font-semibold">(your answer)</span>}
                      {isCorrect && <span className="ml-2 text-xs font-semibold">(correct)</span>}
                    </div>
                  );
                })}
                {q.state === "UNANSWERED" && <p className="text-xs italic text-slate-400">Not answered</p>}
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
