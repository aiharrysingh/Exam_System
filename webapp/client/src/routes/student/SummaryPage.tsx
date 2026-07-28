import { useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api, ApiError } from "../../lib/apiClient";
import type { AttemptSummary } from "../../lib/types";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { ExamTimer } from "../../components/ui/ExamTimer";
import { QuestionNav, QuestionNavLegend } from "../../components/ui/QuestionNav";
import { FullPageSpinner } from "../../components/ui/Spinner";

export function SummaryPage() {
  const { id } = useParams();
  const attemptId = Number(id);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const goToResults = useCallback(
    (message: string) => {
      toast(message);
      navigate(`/results/${attemptId}`, { replace: true });
    },
    [attemptId, navigate]
  );

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
      goToResults("Your test has been submitted.");
    },
  });

  if (summary.isLoading || !summary.data) return <FullPageSpinner />;
  if (summary.data.status !== "IN_PROGRESS") {
    goToResults("This attempt has already finished.");
    return <FullPageSpinner />;
  }

  const unanswered = summary.data.questions.filter((q) => q.state === "UNANSWERED").length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Review your answers</h1>
        <ExamTimer
          deadline={summary.data.deadline}
          serverNow={summary.data.serverNow}
          onExpire={() => !submit.isPending && submit.mutate()}
        />
      </div>

      <Card className="flex flex-col gap-4">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          {unanswered > 0
            ? `You have ${unanswered} unanswered question${unanswered === 1 ? "" : "s"}. Click a number to jump back to it.`
            : "All questions answered. Click a number to review, or submit when ready."}
        </p>
        <QuestionNav items={summary.data.questions} onSelect={(o) => navigate(`/attempts/${attemptId}?order=${o}`)} />
        <QuestionNavLegend />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => navigate(`/attempts/${attemptId}`)}>
            Back to test
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              if (window.confirm("Submit the test now?")) submit.mutate();
            }}
            disabled={submit.isPending}
          >
            {submit.isPending ? "Submitting..." : "Final Submit"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
