import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api, ApiError } from "../../lib/apiClient";
import type { AttemptSummary, QuestionView, ResumeInfo } from "../../lib/types";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { ExamTimer } from "../../components/ui/ExamTimer";
import { QuestionNav, QuestionNavLegend } from "../../components/ui/QuestionNav";
import { FullPageSpinner } from "../../components/ui/Spinner";

export function ExamRunnerPage() {
  const { id } = useParams();
  const attemptId = Number(id);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [searchParams] = useSearchParams();
  const requestedOrder = Number(searchParams.get("order")) || null;
  const [order, setOrder] = useState<number | null>(requestedOrder);
  const [selected, setSelected] = useState<number | null>(null);

  const goToResults = useCallback(
    (message: string) => {
      toast(message);
      navigate(`/results/${attemptId}`, { replace: true });
    },
    [attemptId, navigate]
  );

  const resume = useQuery({
    queryKey: ["attempts", attemptId, "resume"],
    queryFn: async () => {
      try {
        return await api.get<ResumeInfo>(`/attempts/${attemptId}/resume`);
      } catch (err) {
        if (err instanceof ApiError && err.status === 409) {
          goToResults("This attempt has already finished.");
          return null;
        }
        throw err;
      }
    },
  });

  useEffect(() => {
    if (resume.data && order === null) setOrder(resume.data.resumeAtOrder);
  }, [resume.data, order]);

  const question = useQuery({
    queryKey: ["attempts", attemptId, "question", order],
    queryFn: async () => {
      try {
        return await api.get<QuestionView>(`/attempts/${attemptId}/questions/${order}`);
      } catch (err) {
        if (err instanceof ApiError && err.status === 409) {
          goToResults("Time's up — your attempt has been submitted.");
          return null;
        }
        throw err;
      }
    },
    enabled: order !== null,
  });

  useEffect(() => {
    setSelected(question.data?.selectedOptionId ?? null);
  }, [question.data]);

  const summary = useQuery({
    queryKey: ["attempts", attemptId, "summary"],
    queryFn: () => api.get<AttemptSummary>(`/attempts/${attemptId}/summary`),
    enabled: order !== null,
  });

  const saveAnswer = useMutation({
    mutationFn: (params: { questionId: number; selectedOptionId: number | null; state: "ANSWERED" | "MARKED_FOR_REVIEW" | "UNANSWERED" }) =>
      api.put(`/attempts/${attemptId}/answers/${params.questionId}`, {
        selectedOptionId: params.selectedOptionId,
        state: params.state,
      }),
    onError: (err) => {
      if (err instanceof ApiError && err.status === 409) {
        goToResults("Time's up — your attempt has been submitted.");
        return;
      }
      toast.error("Could not save your answer");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["attempts", attemptId, "summary"] }),
  });

  const submit = useMutation({
    mutationFn: () => api.post<{ status: string; score: number; totalMarks: number }>(`/attempts/${attemptId}/submit`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["results"] });
      qc.invalidateQueries({ queryKey: ["attempts", "in-progress"] });
      goToResults("Your test has been submitted.");
    },
  });

  const handleExpire = useCallback(() => {
    if (!submit.isPending) submit.mutate();
  }, [submit]);

  async function saveAndGo(nextOrder: number | "summary", state: "ANSWERED" | "MARKED_FOR_REVIEW" | "UNANSWERED") {
    if (!question.data) return;
    await saveAnswer.mutateAsync({ questionId: question.data.questionId, selectedOptionId: selected, state });
    if (nextOrder === "summary") {
      navigate(`/attempts/${attemptId}/summary`);
    } else {
      setOrder(nextOrder);
    }
  }

  if (resume.isLoading || !resume.data) return <FullPageSpinner />;

  const total = resume.data.totalQuestions;
  const isLast = order === total;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">{resume.data.testName}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Question {order} of {total}
          </p>
        </div>
        <ExamTimer deadline={resume.data.deadline} serverNow={resume.data.serverNow} onExpire={handleExpire} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_260px]">
        <Card className="flex flex-col gap-5">
          {question.isLoading || !question.data ? (
            <FullPageSpinner />
          ) : (
            <>
              <p className="text-lg font-medium text-slate-900 dark:text-white">{question.data.text}</p>
              <div className="flex flex-col gap-2">
                {question.data.options.map((opt) => (
                  <label
                    key={opt.id}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm transition ${
                      selected === opt.id
                        ? "border-brand-500 bg-brand-50 dark:bg-brand-900/20"
                        : "border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"
                    }`}
                  >
                    <input
                      type="radio"
                      name="answer"
                      checked={selected === opt.id}
                      onChange={() => setSelected(opt.id)}
                      className="accent-brand-600"
                    />
                    {opt.text}
                  </label>
                ))}
              </div>

              <div className="mt-2 flex flex-wrap gap-2">
                {order! > 1 && (
                  <Button variant="secondary" onClick={() => saveAndGo(order! - 1, "ANSWERED")} disabled={saveAnswer.isPending}>
                    Previous
                  </Button>
                )}
                <Button
                  variant="secondary"
                  onClick={() => saveAndGo(isLast ? "summary" : order! + 1, "MARKED_FOR_REVIEW")}
                  disabled={saveAnswer.isPending}
                >
                  Mark for review
                </Button>
                <Button onClick={() => saveAndGo(isLast ? "summary" : order! + 1, selected ? "ANSWERED" : "UNANSWERED")} disabled={saveAnswer.isPending}>
                  {isLast ? "View Summary" : "Save & Next"}
                </Button>
              </div>
            </>
          )}
        </Card>

        <Card className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Questions</h2>
          {summary.data && (
            <QuestionNav
              items={summary.data.questions}
              currentOrder={order ?? undefined}
              onSelect={(o) => saveAndGo(o, selected ? "ANSWERED" : "UNANSWERED")}
            />
          )}
          <QuestionNavLegend />
          <Button
            variant="danger"
            onClick={() => {
              if (window.confirm("Submit the test now? You won't be able to change any answers afterward.")) {
                submit.mutate();
              }
            }}
            disabled={submit.isPending}
          >
            Submit test
          </Button>
        </Card>
      </div>
    </div>
  );
}
