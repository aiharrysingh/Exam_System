import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { api } from "../../lib/apiClient";
import type { InProgressAttempt, ResultListItem, TestSummary } from "../../lib/types";
import { staggerContainer, fadeInUp } from "../../lib/motion";
import { useCurrentUser } from "../../lib/useAuth";
import { StatCard } from "../../components/ui/StatCard";
import { Icon } from "../../components/ui/Icon";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { ProgressRing } from "../../components/ui/ProgressRing";
import { AnimatedNumber } from "../../components/ui/AnimatedNumber";
import { SkeletonPage } from "../../components/ui/Skeleton";
import { EmptyState } from "../../components/ui/EmptyState";

function timeLeft(deadline: string) {
  const ms = new Date(deadline).getTime() - Date.now();
  if (ms <= 0) return "expiring now";
  const m = Math.floor(ms / 60000);
  if (m < 60) return `${m} min left`;
  return `${Math.floor(m / 60)}h ${m % 60}m left`;
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { data: user } = useCurrentUser();
  const tests = useQuery({ queryKey: ["tests"], queryFn: () => api.get<TestSummary[]>("/tests") });
  const inProgress = useQuery({
    queryKey: ["attempts", "in-progress"],
    queryFn: () => api.get<InProgressAttempt[]>("/attempts/in-progress"),
  });
  const results = useQuery({ queryKey: ["results"], queryFn: () => api.get<ResultListItem[]>("/results") });

  if (tests.isLoading || inProgress.isLoading || results.isLoading) return <SkeletonPage stats={4} rows={3} />;

  const completed = results.data ?? [];
  const avgPct = completed.length
    ? Math.round(
        (completed.reduce((sum, r) => sum + (r.totalMarks > 0 ? r.score / r.totalMarks : 0), 0) / completed.length) * 100
      )
    : null;
  const best = completed.reduce(
    (acc, r) => Math.max(acc, r.totalMarks > 0 ? Math.round((r.score / r.totalMarks) * 100) : 0),
    0
  );

  return (
    <motion.div variants={staggerContainer(6)} initial="hidden" animate="show" className="flex flex-col gap-6">
      <motion.div variants={fadeInUp}>
        <h1 className="text-2xl font-bold tracking-tight text-fg">
          {user ? `Welcome back, ${user.name.split(" ")[0]}` : "Dashboard"}
        </h1>
        <p className="text-sm text-fg-muted">Your exam activity at a glance.</p>
      </motion.div>

      <motion.div variants={fadeInUp} className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Tests available" value={tests.data?.length ?? 0} icon={<Icon name="list" size={20} />} tone="brand" />
        <StatCard label="In progress" value={inProgress.data?.length ?? 0} icon={<Icon name="clock" size={20} />} tone="warning" />
        <StatCard label="Completed" value={completed.length} icon={<Icon name="check" size={20} />} tone="success" />
        <StatCard
          label="Best score"
          value={completed.length ? best : "—"}
          format={(n) => `${n}%`}
          icon={<Icon name="trophy" size={20} />}
          tone="accent"
        />
      </motion.div>

      {/* ---- Resume: the most time-sensitive thing on the page, so it leads ---- */}
      {inProgress.data && inProgress.data.length > 0 && (
        <motion.div variants={fadeInUp}>
          <Card className="border-warning-500/30 bg-warning-50/40 dark:bg-warning-500/5">
            <div className="mb-3 flex items-center gap-2">
              <Icon name="clock" size={16} className="text-warning-600 dark:text-warning-500" />
              <h2 className="text-base font-semibold text-fg">Resume where you left off</h2>
            </div>
            <div className="flex flex-col gap-2.5">
              {inProgress.data.map((a) => (
                <div
                  key={a.attemptId}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border-subtle bg-surface-1 p-3"
                >
                  <div>
                    <p className="font-medium text-fg">{a.testName}</p>
                    <p className="text-xs text-fg-muted">
                      {a.subjectName} · <span className="text-warning-600 dark:text-warning-500">{timeLeft(a.deadline)}</span>
                    </p>
                  </div>
                  <Button onClick={() => navigate(`/attempts/${a.attemptId}`)}>Resume</Button>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <motion.div variants={fadeInUp}>
          <Card className="h-full">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-fg">Available tests</h2>
              <Link to="/tests" className="text-sm font-semibold text-fg-brand hover:underline">
                View all
              </Link>
            </div>
            {!tests.data || tests.data.length === 0 ? (
              <EmptyState
                variant="compact"
                icon={<Icon name="inbox" size={20} />}
                title="Nothing to take right now"
                description="New tests will show up here once published."
              />
            ) : (
              <div className="flex flex-col gap-2.5">
                {tests.data.slice(0, 4).map((t) => (
                  <Link key={t.id} to="/tests">
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border-subtle p-3 transition-colors hover:border-border-strong hover:bg-surface-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-fg">{t.name}</p>
                          {t.isPractice && (
                            <Badge tone="brand" size="sm">
                              Practice
                            </Badge>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-fg-muted">
                          {t.subject.name} · {t.durationMin} min · {t.totalQuestions} questions
                        </p>
                      </div>
                      <Button variant="secondary" size="sm">
                        Start
                      </Button>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </motion.div>

        {/* ---- Average score: one number, so a ring not a chart ---- */}
        <motion.div variants={fadeInUp}>
          <Card className="flex h-full flex-col items-center justify-center text-center">
            <h2 className="mb-4 text-base font-semibold text-fg">Average score</h2>
            {avgPct === null ? (
              <p className="py-6 text-sm text-fg-muted">Complete a test to see your average.</p>
            ) : (
              <>
                <ProgressRing
                  value={avgPct}
                  size={132}
                  stroke={11}
                  tone={avgPct >= 70 ? "success" : avgPct >= 40 ? "warning" : "danger"}
                >
                  <span className="text-3xl font-bold tracking-tight text-fg">
                    <AnimatedNumber value={avgPct} format={(n) => `${n}%`} />
                  </span>
                </ProgressRing>
                <p className="mt-4 text-xs text-fg-muted">
                  across {completed.length} completed test{completed.length === 1 ? "" : "s"}
                </p>
              </>
            )}
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
