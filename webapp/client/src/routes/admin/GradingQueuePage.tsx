import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import clsx from "clsx";
import { api, ApiError } from "../../lib/apiClient";
import { notify } from "../../lib/toast";
import type { GradingAttemptDetail, GradingQueueItem } from "../../lib/types";
import { staggerContainer, fadeInUp, duration } from "../../lib/motion";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Icon } from "../../components/ui/Icon";
import { Input } from "../../components/ui/Field";
import { Spinner } from "../../components/ui/Spinner";
import { SkeletonList } from "../../components/ui/Skeleton";
import { EmptyState } from "../../components/ui/EmptyState";

export function GradingQueuePage() {
  const qc = useQueryClient();
  const queue = useQuery({ queryKey: ["grading", "queue"], queryFn: () => api.get<GradingQueueItem[]>("/grading/queue") });
  const [activeAttemptId, setActiveAttemptId] = useState<number | null>(null);

  // Keep a valid selection as the queue drains.
  useEffect(() => {
    if (!queue.data || queue.data.length === 0) {
      setActiveAttemptId(null);
      return;
    }
    if (!queue.data.some((i) => i.attemptId === activeAttemptId)) {
      setActiveAttemptId(queue.data[0].attemptId);
    }
  }, [queue.data, activeAttemptId]);

  const detail = useQuery({
    queryKey: ["grading", "attempt", activeAttemptId],
    queryFn: () => api.get<GradingAttemptDetail>(`/grading/attempts/${activeAttemptId}`),
    enabled: activeAttemptId !== null,
  });

  return (
    <motion.div variants={staggerContainer(3)} initial="hidden" animate="show" className="flex flex-col gap-6">
      <motion.div variants={fadeInUp}>
        <h1 className="text-2xl font-bold tracking-tight text-fg">Grading Queue</h1>
        <p className="text-sm text-fg-muted">
          Short-answer questions awaiting manual review. Scores update as soon as you save.
        </p>
      </motion.div>

      {queue.isLoading ? (
        <SkeletonList rows={3} />
      ) : !queue.data || queue.data.length === 0 ? (
        <motion.div variants={fadeInUp}>
          <EmptyState
            icon={<Icon name="check" size={26} />}
            tone="success"
            title="Nothing to grade"
            description="Every submitted attempt is fully graded. Attempts with pending short answers will appear here."
          />
        </motion.div>
      ) : (
        <motion.div variants={fadeInUp} className="grid grid-cols-1 gap-6 lg:grid-cols-[300px_1fr]">
          <Card padding="sm" className="h-fit">
            <p className="px-2 pb-2 pt-1 text-2xs font-semibold uppercase tracking-wider text-fg-muted">
              {queue.data.length} pending
            </p>
            <div className="flex flex-col gap-0.5">
              <AnimatePresence initial={false}>
                {queue.data.map((item) => {
                  const active = activeAttemptId === item.attemptId;
                  return (
                    <motion.button
                      key={item.attemptId}
                      layout
                      exit={{ opacity: 0, height: 0, transition: { duration: duration.base } }}
                      onClick={() => setActiveAttemptId(item.attemptId)}
                      className={clsx(
                        "relative overflow-hidden rounded-lg px-3 py-2.5 text-left transition-colors",
                        active ? "bg-brand-500/10" : "hover:bg-surface-3"
                      )}
                    >
                      {active && (
                        <motion.span
                          layoutId="grading-active"
                          transition={{ duration: duration.base }}
                          className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-brand-500"
                        />
                      )}
                      <p className={clsx("text-sm font-medium", active ? "text-fg-brand" : "text-fg")}>
                        {item.studentName}
                      </p>
                      <p className="truncate text-xs text-fg-muted">{item.testName}</p>
                    </motion.button>
                  );
                })}
              </AnimatePresence>
            </div>
          </Card>

          <div className="flex flex-col gap-4">
            {detail.isLoading || !detail.data ? (
              <Card className="grid h-40 place-items-center">
                <Spinner />
              </Card>
            ) : (
              <>
                <Card padding="sm">
                  <p className="font-semibold text-fg">{detail.data.studentName}</p>
                  <p className="text-sm text-fg-muted">{detail.data.testName}</p>
                </Card>
                {detail.data.answers.map((a) => (
                  <GradeRow key={a.answerId} answer={a} qc={qc} />
                ))}
              </>
            )}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

function GradeRow({
  answer,
  qc,
}: {
  answer: GradingAttemptDetail["answers"][number];
  qc: ReturnType<typeof useQueryClient>;
}) {
  const [marks, setMarks] = useState(answer.awardedMarks ?? 0);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => setMarks(answer.awardedMarks ?? 0), [answer.awardedMarks]);

  const grade = useMutation({
    mutationFn: () => api.put(`/grading/answers/${answer.answerId}`, { awardedMarks: marks }),
    onSuccess: () => {
      // An inline tick rather than a toast — bulk grading would spam the corner.
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 1600);
      qc.invalidateQueries({ queryKey: ["grading"] });
      qc.invalidateQueries({ queryKey: ["studycenter"] });
    },
    onError: (err) => notify.error(err instanceof ApiError ? err.message : "Could not save grade"),
  });

  const invalid = marks < 0 || marks > answer.maxMarks;

  return (
    <Card className="flex flex-col gap-3">
      <p className="font-medium text-fg">{answer.text}</p>
      <div className="rounded-lg border border-border-subtle bg-surface-2 px-3 py-2.5 text-sm text-fg-secondary">
        {answer.textResponse || <span className="italic text-fg-muted">No answer submitted</span>}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm font-medium text-fg-secondary">
          Award
          <Input
            type="number"
            min={0}
            max={answer.maxMarks}
            value={marks}
            onChange={(e) => setMarks(Number(e.target.value))}
            className="w-20 text-center tabular-nums"
            aria-label={`Marks awarded, maximum ${answer.maxMarks}`}
          />
          <span className="text-fg-muted">/ {answer.maxMarks}</span>
        </label>
        <Button onClick={() => grade.mutate()} loading={grade.isPending} disabled={invalid} size="sm">
          {answer.awardedMarks !== null ? "Update grade" : "Save grade"}
        </Button>
        <AnimatePresence>
          {justSaved && (
            <motion.span
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-1.5 text-sm font-medium text-success-700 dark:text-success-500"
            >
              <Icon name="check" size={15} /> Saved
            </motion.span>
          )}
        </AnimatePresence>
        {invalid && <span className="text-xs text-danger-600">Must be between 0 and {answer.maxMarks}.</span>}
      </div>
    </Card>
  );
}
