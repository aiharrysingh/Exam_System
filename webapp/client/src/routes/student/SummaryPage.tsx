import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "motion/react";
import { api, ApiError } from "../../lib/apiClient";
import { notify } from "../../lib/toast";
import type { AttemptSummary } from "../../lib/types";
import { fadeInUp } from "../../lib/motion";
import { ExamShell } from "../../components/layout/ExamShell";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Icon } from "../../components/ui/Icon";
import { QuestionNav, QuestionNavLegend } from "../../components/ui/QuestionNav";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { SubmitCelebration } from "../../components/ui/SubmitCelebration";
import { AnimatedNumber } from "../../components/ui/AnimatedNumber";
import { Spinner } from "../../components/ui/Spinner";

export function SummaryPage() {
  const { id } = useParams();
  const attemptId = Number(id);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const celebrationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const goToResults = useCallback(
    (message?: string) => {
      if (message) notify.info(message);
      navigate(`/results/${attemptId}`, { replace: true });
    },
    [attemptId, navigate]
  );

  useEffect(() => () => { if (celebrationTimer.current) clearTimeout(celebrationTimer.current); }, []);

  const summary = useQuery({
    queryKey: ["attempts", attemptId, "summary"],
    queryFn: async () => {
      try {
        return await api.get<AttemptSummary>(`/attempts/${attemptId}/summary`);
      } catch (err) {
        if (err instanceof ApiError && err.status === 409) {
          goToResults("This attempt has already finished.");
          return null;
        }
        throw err;
      }
    },
  });

  const submit = useMutation({
    mutationFn: () => api.post<{ status: string }>(`/attempts/${attemptId}/submit`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["results"] });
      qc.invalidateQueries({ queryKey: ["attempts", "in-progress"] });
      setCelebrating(true);
      celebrationTimer.current = setTimeout(() => goToResults(), 900);
    },
    onError: (err) => {
      if (err instanceof ApiError && err.status === 409) goToResults("This attempt has already finished.");
      else notify.error("Could not submit your test");
    },
  });

  // Redirect from an effect, never during render.
  useEffect(() => {
    if (summary.data && summary.data.status !== "IN_PROGRESS" && !celebrating) {
      goToResults("This attempt has already finished.");
    }
  }, [summary.data, celebrating, goToResults]);

  if (summary.isLoading || !summary.data) {
    return (
      <div className="grid h-screen place-items-center bg-canvas">
        <Spinner size="lg" />
      </div>
    );
  }

  const questions = summary.data.questions;
  const unanswered = questions.filter((q) => q.state === "UNANSWERED").length;
  const marked = questions.filter((q) => q.state === "MARKED_FOR_REVIEW").length;
  const answered = questions.length - unanswered;

  return (
    <>
      <ExamShell
        testName="Review your answers"
        answered={answered}
        total={questions.length}
        deadline={summary.data.deadline}
        serverNow={summary.data.serverNow}
        onExpire={() => !submit.isPending && submit.mutate()}
      >
        <motion.div variants={fadeInUp} initial="hidden" animate="show" className="flex flex-col gap-6">
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Answered", value: answered, tone: "text-success-700 dark:text-success-500" },
              { label: "Marked for review", value: marked, tone: "text-warning-700 dark:text-warning-500" },
              { label: "Unanswered", value: unanswered, tone: "text-danger-600 dark:text-danger-500" },
            ].map((s) => (
              <Card key={s.label} padding="sm" className="text-center">
                <p className={`text-2xl font-bold ${s.tone}`}>
                  <AnimatedNumber value={s.value} />
                </p>
                <p className="mt-0.5 text-xs text-fg-muted">{s.label}</p>
              </Card>
            ))}
          </div>

          <Card className="flex flex-col gap-4">
            <p className="text-sm text-fg-secondary">
              {unanswered > 0
                ? `You have ${unanswered} unanswered question${unanswered === 1 ? "" : "s"}. Select a number to jump back to it.`
                : "Every question is answered. Select a number to review, or submit when you're ready."}
            </p>
            <QuestionNav items={questions} onSelect={(o) => navigate(`/attempts/${attemptId}?order=${o}`)} />
            <QuestionNavLegend />
            <div className="flex flex-wrap justify-end gap-2 border-t border-border-subtle pt-4">
              <Button
                variant="secondary"
                onClick={() => navigate(`/attempts/${attemptId}`)}
                iconLeft={<Icon name="list" size={16} />}
              >
                Back to test
              </Button>
              <Button variant="danger" onClick={() => setConfirmSubmit(true)} disabled={submit.isPending}>
                Submit test
              </Button>
            </div>
          </Card>
        </motion.div>
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
          unanswered > 0
            ? `You still have ${unanswered} unanswered question${unanswered === 1 ? "" : "s"}. You won't be able to change any answers after submitting.`
            : "All questions are answered. You won't be able to change anything after submitting."
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
