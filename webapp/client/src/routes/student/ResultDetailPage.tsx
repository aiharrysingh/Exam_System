import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { motion } from "motion/react";
import clsx from "clsx";
import { api } from "../../lib/apiClient";
import type { ResultDetail } from "../../lib/types";
import { staggerContainer, fadeInUp } from "../../lib/motion";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Icon } from "../../components/ui/Icon";
import { ProgressRing } from "../../components/ui/ProgressRing";
import { AnimatedNumber } from "../../components/ui/AnimatedNumber";
import { SkeletonPage } from "../../components/ui/Skeleton";

export function ResultDetailPage() {
  const { attemptId } = useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["results", attemptId],
    queryFn: () => api.get<ResultDetail>(`/results/${attemptId}`),
  });

  if (isLoading || !data) return <SkeletonPage rows={3} />;
  const pct = data.totalMarks > 0 ? Math.round((data.score / data.totalMarks) * 100) : 0;
  const tone = pct >= 70 ? "success" : pct >= 40 ? "warning" : "danger";

  return (
    <motion.div variants={staggerContainer(6)} initial="hidden" animate="show" className="flex flex-col gap-6">
      <motion.div variants={fadeInUp}>
        <Link to="/results" className="text-sm font-semibold text-fg-brand hover:underline">
          ← Back to results
        </Link>
      </motion.div>

      {/* ---- Score hero: one number, so a ring, not a chart ---- */}
      <motion.div variants={fadeInUp}>
        <Card padding="lg">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="min-w-0">
              <h1 className="text-xl font-bold tracking-tight text-fg">{data.testName}</h1>
              <p className="text-sm text-fg-muted">{data.subjectName}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge tone={data.status === "EXPIRED" ? "warning" : "success"}>
                  {data.status === "EXPIRED" ? "Time expired" : "Submitted"}
                </Badge>
                {data.gradingStatus === "PENDING_REVIEW" && (
                  <Badge tone="warning" dot>
                    Pending review
                  </Badge>
                )}
              </div>
              <a
                href={`/api/results/${attemptId}/certificate`}
                target="_blank"
                rel="noreferrer"
                className="mt-5 inline-block"
              >
                <Button variant="secondary" iconLeft={<Icon name="upload" size={16} />}>
                  Download certificate
                </Button>
              </a>
            </div>

            <ProgressRing value={pct} size={148} stroke={12} tone={tone}>
              <div className="text-center">
                <span className="block text-3xl font-bold tracking-tight text-fg">
                  <AnimatedNumber value={pct} format={(n) => `${n}%`} />
                </span>
                <span className="mt-0.5 block text-xs tabular-nums text-fg-muted">
                  {data.score} / {data.totalMarks}
                </span>
              </div>
            </ProgressRing>
          </div>
        </Card>
      </motion.div>

      {data.gradingStatus === "PENDING_REVIEW" && (
        <motion.div variants={fadeInUp}>
          <Card className="flex items-start gap-3 border-warning-500/30 bg-warning-50/50 dark:bg-warning-500/5">
            <Icon name="clock" size={18} className="mt-0.5 shrink-0 text-warning-600 dark:text-warning-500" />
            <p className="text-sm text-fg-secondary">
              One or more short-answer questions are still awaiting manual review. Your score above is provisional and
              may change once grading is complete.
            </p>
          </Card>
        </motion.div>
      )}

      <div className="flex flex-col gap-4">
        {data.questions.map((q, i) => (
          <motion.div key={q.questionId} variants={fadeInUp}>
            <Card className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <p className="font-medium text-fg">
                  <span className="text-fg-muted">{i + 1}.</span> {q.text}
                </p>
                <Badge
                  tone={q.awarded === null ? "warning" : q.awarded > 0 ? "success" : "danger"}
                  size="sm"
                >
                  {q.awarded === null ? "Pending" : `${q.awarded}/${q.marks}`}
                </Badge>
              </div>

              {q.type === "SHORT_ANSWER" ? (
                <div className="rounded-lg border border-border-subtle bg-surface-2 px-3 py-2.5 text-sm text-fg-secondary">
                  {q.textResponse || <span className="italic text-fg-muted">Not answered</span>}
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
                          "flex items-center gap-2.5 rounded-lg border px-3 py-2 text-sm",
                          isCorrect &&
                            "border-success-500/40 bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-500",
                          isSelected &&
                            !isCorrect &&
                            "border-danger-500/40 bg-danger-50 text-danger-700 dark:bg-danger-500/10 dark:text-danger-500",
                          !isSelected && !isCorrect && "border-border-subtle text-fg-secondary"
                        )}
                      >
                        <span className="w-4 shrink-0">
                          {isCorrect && <Icon name="check" size={14} />}
                          {isSelected && !isCorrect && (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                            </svg>
                          )}
                        </span>
                        <span className="flex-1">{opt.text}</span>
                        {isSelected && <span className="text-2xs font-semibold uppercase tracking-wider">your answer</span>}
                      </div>
                    );
                  })}
                  {q.state === "UNANSWERED" && (
                    <p className="text-xs italic text-fg-muted">You didn't answer this question.</p>
                  )}
                </div>
              )}
            </Card>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
