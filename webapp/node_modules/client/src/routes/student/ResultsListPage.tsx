import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { api } from "../../lib/apiClient";
import type { ResultListItem } from "../../lib/types";
import { staggerContainer, fadeInUp } from "../../lib/motion";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Icon } from "../../components/ui/Icon";
import { ProgressBar } from "../../components/ui/ProgressBar";
import { SkeletonList } from "../../components/ui/Skeleton";
import { EmptyState } from "../../components/ui/EmptyState";

export function ResultsListPage() {
  const { data, isLoading } = useQuery({ queryKey: ["results"], queryFn: () => api.get<ResultListItem[]>("/results") });

  return (
    <motion.div variants={staggerContainer(4)} initial="hidden" animate="show" className="flex flex-col gap-6">
      <motion.div variants={fadeInUp}>
        <h1 className="text-2xl font-bold tracking-tight text-fg">My Results</h1>
        <p className="text-sm text-fg-muted">Every test you've completed, submitted or expired.</p>
      </motion.div>

      {isLoading ? (
        <SkeletonList rows={3} />
      ) : !data || data.length === 0 ? (
        <motion.div variants={fadeInUp}>
          <EmptyState
            icon={<Icon name="chart" size={26} />}
            title="No completed tests yet"
            description="Once you finish a test, your score and a full per-question breakdown will appear here."
          />
        </motion.div>
      ) : (
        <div className="flex flex-col gap-3">
          {data.map((r) => {
            const pct = r.totalMarks > 0 ? Math.round((r.score / r.totalMarks) * 100) : 0;
            return (
              <motion.div key={r.attemptId} variants={fadeInUp}>
                <Link to={`/results/${r.attemptId}`} className="block">
                  <Card interactive className="flex flex-wrap items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-fg">{r.testName}</p>
                        <Badge tone={r.status === "EXPIRED" ? "warning" : "success"} size="sm">
                          {r.status === "EXPIRED" ? "Time expired" : "Submitted"}
                        </Badge>
                        {r.gradingStatus === "PENDING_REVIEW" && (
                          <Badge tone="warning" size="sm" dot>
                            Pending review
                          </Badge>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-fg-muted">
                        {r.subjectName}
                        {r.endTime && ` · ${new Date(r.endTime).toLocaleDateString()}`}
                      </p>
                    </div>
                    <div className="w-40 shrink-0">
                      <div className="mb-1.5 flex justify-between text-sm font-semibold tabular-nums text-fg">
                        <span>
                          {r.score}/{r.totalMarks}
                        </span>
                        <span className="text-fg-muted">{pct}%</span>
                      </div>
                      <ProgressBar
                        value={r.score}
                        max={r.totalMarks}
                        tone={pct >= 70 ? "success" : pct >= 40 ? "warning" : "danger"}
                      />
                    </div>
                  </Card>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
