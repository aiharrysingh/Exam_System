import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import clsx from "clsx";
import { api, ApiError } from "../../lib/apiClient";
import { notify } from "../../lib/toast";
import type { AttemptSummary, QuestionView, ResumeInfo } from "../../lib/types";
import { slideQuestion, duration, ease } from "../../lib/motion";
import { ExamShell } from "../../components/layout/ExamShell";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Textarea } from "../../components/ui/Field";
import { QuestionNav, QuestionNavLegend } from "../../components/ui/QuestionNav";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { SubmitCelebration } from "../../components/ui/SubmitCelebration";
import { Spinner } from "../../components/ui/Spinner";

type AnswerState = "ANSWERED" | "MARKED_FOR_REVIEW" | "UNANSWERED";

export function ExamRunnerPage() {
  const { id } = useParams();
  const attemptId = Number(id);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedOrder = Number(searchParams.get("order")) || null;

  const [order, setOrder] = useState<number | null>(requestedOrder);
  const [selected, setSelected] = useState<number[]>([]);
  const [textResponse, setTextResponse] = useState("");
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [celebrating, setCelebrating] = useState(false);

  // +1 forward / -1 back, read by the slide variant.
  const dirRef = useRef(1);
  const questionLoadedAt = useRef(Date.now());
  const celebrationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const goToResults = useCallback(
    (message?: string) => {
      if (message) notify.info(message);
      navigate(`/results/${attemptId}`, { replace: true });
    },
    [attemptId, navigate]
  );

  const resume = useQueryResume(attemptId, goToResults);
  const question = useQueryQuestion(attemptId, order, goToResults);
  const summary = useQuerySummary(attemptId, order !== null);

  useEffect(() => {
    if (resume.data && order === null) setOrder(resume.data.resumeAtOrder);
  }, [resume.data, order]);

  // Re-seed local answer state (and the timing baseline) when a question loads.
  // This must stay keyed on the fetched data — moving it into an animation
  // callback would bill animation time to the student's time-on-question.
  useEffect(() => {
    setSelected(question.data?.selectedOptionIds ?? []);
    setTextResponse(question.data?.textResponse ?? "");
    questionLoadedAt.current = Date.now();
  }, [question.data]);

  useEffect(() => () => { if (celebrationTimer.current) clearTimeout(celebrationTimer.current); }, []);

  const { saveAnswer, submit } = useAttemptMutations(attemptId, goToResults, () => {
    setCelebrating(true);
    celebrationTimer.current = setTimeout(() => goToResults(), 900);
  });

  const handleExpire = useCallback(() => {
    if (!submit.isPending) submit.mutate();
  }, [submit]);

  const isAnswered = () =>
    question.data?.type === "SHORT_ANSWER" ? textResponse.trim().length > 0 : selected.length > 0;

  async function saveAndGo(next: number | "summary", state: AnswerState) {
    if (!question.data || order === null) return;
    if (next !== "summary") dirRef.current = next > order ? 1 : -1;

    // Elapsed is captured synchronously here, before any animation runs.
    const timeSpentMs = Date.now() - questionLoadedAt.current;

    // The exit animation is already running; we never await it, and we never
    // move the navigation into an onAnimationComplete callback.
    await saveAnswer.mutateAsync({
      questionId: question.data.questionId,
      selectedOptionIds: selected,
      textResponse,
      state,
      timeSpentMs,
    });

    if (next === "summary") navigate(`/attempts/${attemptId}/summary`);
    else setOrder(next);
  }

  function toggleOption(optId: number) {
    if (question.data?.type === "MULTI_SELECT") {
      setSelected((prev) => (prev.includes(optId) ? prev.filter((x) => x !== optId) : [...prev, optId]));
    } else {
      setSelected([optId]);
    }
  }

  if (resume.isLoading || !resume.data) {
    return (
      <div className="grid h-screen place-items-center bg-canvas">
        <Spinner size="lg" />
      </div>
    );
  }

  const total = resume.data.totalQuestions;
  const isLast = order === total;
  const answeredCount = summary.data?.questions.filter((q) => q.state !== "UNANSWERED").length ?? 0;

  return (
    <>
      <ExamShell
        testName={resume.data.testName}
        answered={answeredCount}
        total={total}
        currentOrder={order ?? undefined}
        deadline={resume.data.deadline}
        serverNow={resume.data.serverNow}
        totalMs={resume.data.durationMin * 60_000}
        onExpire={handleExpire}
        saving={saveAnswer.isPending}
      >
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_248px]">
          <Card padding="lg" className="min-h-[22rem]">
            {question.isLoading || !question.data ? (
              <div className="grid h-full min-h-[16rem] place-items-center">
                <Spinner />
              </div>
            ) : (
              <AnimatePresence mode="wait" custom={dirRef.current} initial={false}>
                <motion.div
                  key={order}
                  custom={dirRef.current}
                  variants={slideQuestion}
                  initial="hidden"
                  animate="show"
                  exit="exit"
                  className="flex flex-col gap-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-lg font-medium leading-relaxed text-fg">{question.data.text}</p>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <Badge tone="neutral" size="sm">
                        {question.data.marks} mark{question.data.marks === 1 ? "" : "s"}
                      </Badge>
                      {question.data.type === "MULTI_SELECT" && (
                        <Badge tone="brand" size="sm">
                          Select all that apply
                        </Badge>
                      )}
                    </div>
                  </div>

                  {question.data.type === "SHORT_ANSWER" ? (
                    <Textarea
                      value={textResponse}
                      onChange={(e) => setTextResponse(e.target.value)}
                      rows={6}
                      placeholder="Type your answer…"
                      aria-label="Your answer"
                    />
                  ) : (
                    <div className="flex flex-col gap-2">
                      {question.data.options.map((opt, i) => (
                        <OptionRow
                          key={opt.id}
                          index={i}
                          multi={question.data!.type === "MULTI_SELECT"}
                          checked={selected.includes(opt.id)}
                          label={opt.text}
                          onChange={() => toggleOption(opt.id)}
                        />
                      ))}
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            )}

            <div className="mt-7 flex flex-wrap gap-2">
              {order !== null && order > 1 && (
                <Button
                  variant="secondary"
                  onClick={() => saveAndGo(order - 1, isAnswered() ? "ANSWERED" : "UNANSWERED")}
                  disabled={saveAnswer.isPending}
                >
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
              <Button
                className="ml-auto"
                onClick={() => saveAndGo(isLast ? "summary" : order! + 1, isAnswered() ? "ANSWERED" : "UNANSWERED")}
                disabled={saveAnswer.isPending}
              >
                {isLast ? "Review answers" : "Save & next"}
              </Button>
            </div>
          </Card>

          <Card className="flex h-fit flex-col gap-4">
            <h2 className="text-sm font-semibold text-fg">Questions</h2>
            {summary.data && (
              <QuestionNav
                items={summary.data.questions}
                currentOrder={order ?? undefined}
                onSelect={(o) => saveAndGo(o, isAnswered() ? "ANSWERED" : "UNANSWERED")}
              />
            )}
            <QuestionNavLegend />
            <Button variant="danger" onClick={() => setConfirmSubmit(true)} disabled={submit.isPending}>
              Submit test
            </Button>
          </Card>
        </div>
      </ExamShell>

      <ConfirmDialog
        open={confirmSubmit}
        onClose={() => setConfirmSubmit(false)}
        onConfirm={() => {
          setConfirmSubmit(false);
          submit.mutate();
        }}
        title="Submit your test?"
        body={
          summary.data
            ? (() => {
                const un = summary.data.questions.filter((q) => q.state === "UNANSWERED").length;
                return un > 0
                  ? `You still have ${un} unanswered question${un === 1 ? "" : "s"}. You won't be able to change any answers after submitting.`
                  : "All questions are answered. You won't be able to change anything after submitting.";
              })()
            : "You won't be able to change any answers after submitting."
        }
        confirmLabel="Submit test"
        loading={submit.isPending}
      />

      <AnimatePresence>
        {celebrating && (
          <SubmitCelebration
            onSkip={() => {
              if (celebrationTimer.current) clearTimeout(celebrationTimer.current);
              goToResults();
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}

/* ------------------------------------------------------------------ */

function OptionRow({
  index,
  multi,
  checked,
  label,
  onChange,
}: {
  index: number;
  multi: boolean;
  checked: boolean;
  label: string;
  onChange: () => void;
}) {
  return (
    <motion.label
      // Options stagger in, capped so the first is clickable immediately.
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: duration.base, ease: ease.out, delay: Math.min(index * 0.03, 0.15) }}
      whileTap={{ scale: 0.995 }}
      className={clsx(
        "flex cursor-pointer items-center gap-3 rounded-lg border p-3.5 text-sm transition-colors",
        checked
          ? "border-brand-500 bg-brand-500/8 ring-1 ring-inset ring-brand-500/25"
          : "border-border-default hover:border-border-strong hover:bg-surface-2"
      )}
    >
      {/* A real input stays in the DOM — keyboard and assistive tech depend on it. */}
      <input
        type={multi ? "checkbox" : "radio"}
        name="answer"
        checked={checked}
        onChange={onChange}
        className="sr-only"
      />
      <span
        aria-hidden="true"
        className={clsx(
          "grid h-5 w-5 shrink-0 place-items-center border transition-colors",
          multi ? "rounded-[5px]" : "rounded-full",
          checked ? "border-brand-600 bg-brand-600 text-white" : "border-border-strong bg-surface-1"
        )}
      >
        {checked &&
          (multi ? (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <motion.path
                d="M5 12.5l4.2 4.2L19 7"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.16, ease: ease.out }}
              />
            </svg>
          ) : (
            <motion.span
              className="h-2 w-2 rounded-full bg-white"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.14, ease: ease.out }}
            />
          ))}
      </span>
      <span className="text-fg">{label}</span>
    </motion.label>
  );
}

/* --- query/mutation helpers, split out to keep the component readable --- */

function useQueryResume(attemptId: number, goToResults: (m?: string) => void) {
  return useQuery({
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
}

function useQueryQuestion(attemptId: number, order: number | null, goToResults: (m?: string) => void) {
  return useQuery({
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
}

function useQuerySummary(attemptId: number, enabled: boolean) {
  return useQuery({
    queryKey: ["attempts", attemptId, "summary"],
    queryFn: () => api.get<AttemptSummary>(`/attempts/${attemptId}/summary`),
    enabled,
  });
}

function useAttemptMutations(attemptId: number, goToResults: (m?: string) => void, onSubmitted: () => void) {
  const qc = useQueryClient();

  const saveAnswer = useMutation({
    mutationFn: (p: {
      questionId: number;
      selectedOptionIds: number[];
      textResponse: string;
      state: AnswerState;
      timeSpentMs: number;
    }) =>
      api.put(`/attempts/${attemptId}/answers/${p.questionId}`, {
        selectedOptionIds: p.selectedOptionIds,
        textResponse: p.textResponse || undefined,
        state: p.state,
        timeSpentMs: p.timeSpentMs,
      }),
    onError: (err) => {
      if (err instanceof ApiError && err.status === 409) {
        goToResults("Time's up — your attempt has been submitted.");
        return;
      }
      notify.error("Could not save your answer");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["attempts", attemptId, "summary"] }),
  });

  const submit = useMutation({
    mutationFn: () => api.post<{ status: string }>(`/attempts/${attemptId}/submit`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["results"] });
      qc.invalidateQueries({ queryKey: ["attempts", "in-progress"] });
      onSubmitted();
    },
    onError: (err) => {
      if (err instanceof ApiError && err.status === 409) goToResults("This attempt has already finished.");
      else notify.error("Could not submit your test");
    },
  });

  return { saveAnswer, submit };
}
