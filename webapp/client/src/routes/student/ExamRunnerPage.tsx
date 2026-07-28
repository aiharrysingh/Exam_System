import { useCallback, useEffect, useRef, useState } from "react";
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

type AnswerState = "ANSWERED" | "MARKED_FOR_REVIEW" | "UNANSWERED";

export function ExamRunnerPage() {
  const { id } = useParams();
  const attemptId = Number(id);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [searchParams] = useSearchParams();
  const requestedOrder = Number(searchParams.get("order")) || null;
  const [order, setOrder] = useState<number | null>(requestedOrder);
  const [selected, setSelected] = useState<number[]>([]);
  const [textResponse, setTextResponse] = useState("");
  const questionLoadedAt = useRef(Date.now());

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
    setSelected(question.data?.selectedOptionIds ?? []);
    setTextResponse(question.data?.textResponse ?? "");
    questionLoadedAt.current = Date.now();
  }, [question.data]);

  const summary = useQuery({
    queryKey: ["attempts", attemptId, "summary"],
    queryFn: () => api.get<AttemptSummary>(`/attempts/${attemptId}/summary`),
    enabled: order !== null,
  });

  const saveAnswer = useMutation({
    mutationFn: (params: { questionId: number; selectedOptionIds: number[]; textResponse: string; state: AnswerState; timeSpentMs: number }) =>
      api.put(`/attempts/${attemptId}/answers/${params.questionId}`, {
        selectedOptionIds: params.selectedOptionIds,
        textResponse: params.textResponse || undefined,
        state: params.state,
        timeSpentMs: params.timeSpentMs,
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

  function isAnswered() {
    return question.data?.type === "SHORT_ANSWER" ? textResponse.trim().length > 0 : selected.length > 0;
  }

  async function saveAndGo(nextOrder: number | "summary", state: AnswerState) {
    if (!question.data) return;
    const timeSpentMs = Date.now() - questionLoadedAt.current;
    await saveAnswer.mutateAsync({ questionId: question.data.questionId, selectedOptionIds: selected, textResponse, state, timeSpentMs });
    if (nextOrder === "summary") {
      navigate(`/attempts/${attemptId}/summary`);
    } else {
      setOrder(nextOrder);
    }
  }

  function toggleOption(optId: number) {
    const type = question.data?.type;
    if (type === "MULTI_SELECT") {
      setSelected((prev) => (prev.includes(optId) ? prev.filter((id) => id !== optId) : [...prev, optId]));
    } else {
      setSelected([optId]);
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
              <div className="flex items-start justify-between gap-3">
                <p className="text-lg font-medium text-slate-900 dark:text-white">{question.data.text}</p>
                {question.data.type === "MULTI_SELECT" && (
                  <span className="shrink-0 rounded-full bg-brand-100 px-2.5 py-1 text-xs font-semibold text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
                    Select all that apply
                  </span>
                )}
              </div>

              {question.data.type === "SHORT_ANSWER" ? (
                <textarea
                  value={textResponse}
                  onChange={(e) => setTextResponse(e.target.value)}
                  rows={5}
                  placeholder="Type your answer..."
                  className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              ) : (
                <div className="flex flex-col gap-2">
                  {question.data.options.map((opt) => (
                    <label
                      key={opt.id}
                      className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm transition ${
                        selected.includes(opt.id)
                          ? "border-brand-500 bg-brand-50 dark:bg-brand-900/20"
                          : "border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"
                      }`}
                    >
                      <input
                        type={question.data!.type === "MULTI_SELECT" ? "checkbox" : "radio"}
                        name="answer"
                        checked={selected.includes(opt.id)}
                        onChange={() => toggleOption(opt.id)}
                        className="accent-brand-600"
                      />
                      {opt.text}
                    </label>
                  ))}
                </div>
              )}

              <div className="mt-2 flex flex-wrap gap-2">
                {order! > 1 && (
                  <Button variant="secondary" onClick={() => saveAndGo(order! - 1, isAnswered() ? "ANSWERED" : "UNANSWERED")} disabled={saveAnswer.isPending}>
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
                <Button onClick={() => saveAndGo(isLast ? "summary" : order! + 1, isAnswered() ? "ANSWERED" : "UNANSWERED")} disabled={saveAnswer.isPending}>
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
              onSelect={(o) => saveAndGo(o, isAnswered() ? "ANSWERED" : "UNANSWERED")}
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
