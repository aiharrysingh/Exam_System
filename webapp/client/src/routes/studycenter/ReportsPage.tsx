import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, useReducedMotion } from "motion/react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "../../lib/apiClient";
import type { ItemAnalysisRow, TestSummary } from "../../lib/types";
import { useChartTheme, P_VALUE_FLAG } from "../../lib/chartTheme";
import { staggerContainer, fadeInUp } from "../../lib/motion";
import { Card } from "../../components/ui/Card";
import { StatCard } from "../../components/ui/StatCard";
import { Badge } from "../../components/ui/Badge";
import { Icon } from "../../components/ui/Icon";
import { Select } from "../../components/ui/Field";
import { ChartTooltip } from "../../components/ui/ChartTooltip";
import { SkeletonPage } from "../../components/ui/Skeleton";
import { EmptyState } from "../../components/ui/EmptyState";

interface Stats {
  testId: number;
  totalMarks: number;
  attemptCount: number;
  averageScore: number;
  distribution: { bucket: string; count: number }[];
}

interface AttemptRow {
  attemptId: number;
  studentName: string;
  status: string;
  score: number;
  endTime: string | null;
}

export function ReportsPage() {
  const theme = useChartTheme();
  const reduce = useReducedMotion();
  const tests = useQuery({ queryKey: ["tests"], queryFn: () => api.get<TestSummary[]>("/tests") });
  const [testId, setTestId] = useState<number | null>(null);
  const activeTestId = testId ?? tests.data?.[0]?.id ?? null;

  const stats = useQuery({
    queryKey: ["studycenter", "stats", activeTestId],
    queryFn: () => api.get<Stats>(`/studycenter/tests/${activeTestId}/stats`),
    enabled: activeTestId !== null,
  });
  const attempts = useQuery({
    queryKey: ["studycenter", "attempts", activeTestId],
    queryFn: () => api.get<AttemptRow[]>(`/studycenter/attempts?testId=${activeTestId}`),
    enabled: activeTestId !== null,
  });
  const itemAnalysis = useQuery({
    queryKey: ["studycenter", "item-analysis", activeTestId],
    queryFn: () => api.get<ItemAnalysisRow[]>(`/studycenter/tests/${activeTestId}/item-analysis`),
    enabled: activeTestId !== null,
  });

  if (tests.isLoading) return <SkeletonPage stats={3} rows={3} />;
  if (!tests.data || tests.data.length === 0) {
    return (
      <EmptyState
        icon={<Icon name="chart" size={26} />}
        title="No published tests yet"
        description="Reports appear once a test has been published and taken."
      />
    );
  }

  const hasAttempts = (stats.data?.attemptCount ?? 0) > 0;
  const itemRows = itemAnalysis.data ?? [];
  const flagged = itemRows.filter((r) => r.pValue !== null && r.pValue < P_VALUE_FLAG);

  return (
    <motion.div
      variants={staggerContainer(5)}
      initial="hidden"
      animate="show"
      className="flex flex-col gap-6"
    >
      <motion.div variants={fadeInUp} className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-fg">Reports</h1>
          <p className="text-sm text-fg-muted">Score distribution and per-question difficulty.</p>
        </div>
        {/* One filter row above everything it scopes — never inside a chart card. */}
        <Select
          aria-label="Select test"
          value={activeTestId ?? ""}
          onChange={(e) => setTestId(Number(e.target.value))}
          className="w-full sm:w-72"
        >
          {tests.data.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </Select>
      </motion.div>

      {stats.data && (
        <motion.div variants={fadeInUp} className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          <StatCard label="Attempts" value={stats.data.attemptCount} icon={<Icon name="pencil" size={20} />} tone="brand" />
          <StatCard
            label="Average score"
            value={Number(stats.data.averageScore.toFixed(1))}
            icon={<Icon name="chart" size={20} />}
            tone="accent"
            hint={stats.data.totalMarks > 0 ? `out of ${stats.data.totalMarks}` : undefined}
          />
          <StatCard
            label="Items to review"
            value={flagged.length}
            icon={<Icon name="inbox" size={20} />}
            tone={flagged.length > 0 ? "warning" : "success"}
            hint={`under ${Math.round(P_VALUE_FLAG * 100)}% correct`}
          />
        </motion.div>
      )}

      {!hasAttempts ? (
        <motion.div variants={fadeInUp}>
          <EmptyState
            icon={<Icon name="inbox" size={26} />}
            title="No attempts yet"
            description="Once students complete this test, its score distribution and item analysis will appear here."
          />
        </motion.div>
      ) : (
        <>
          {/* ---- Score distribution: ordered bands -> validated ordinal ramp ---- */}
          {stats.data && (
            <motion.div variants={fadeInUp}>
              <Card>
                <h2 className="text-base font-semibold text-fg">Score distribution</h2>
                <p className="mb-5 text-sm text-fg-muted">
                  How many students landed in each score band.
                </p>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      // Re-key on theme so the container re-measures cleanly.
                      key={theme.mode}
                      data={stats.data.distribution}
                      margin={{ top: 16, right: 8, bottom: 4, left: -16 }}
                    >
                      <CartesianGrid stroke={theme.grid} vertical={false} />
                      <XAxis
                        dataKey="bucket"
                        tick={{ fontSize: 12, fill: theme.tick }}
                        tickLine={false}
                        axisLine={{ stroke: theme.axis }}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fontSize: 12, fill: theme.tick }}
                        tickLine={false}
                        axisLine={false}
                        width={44}
                      />
                      <Tooltip
                        cursor={{ fill: theme.grid, fillOpacity: 0.45 }}
                        content={
                          <ChartTooltip
                            labelFormatter={(l) => `${l} of marks`}
                            formatter={(v) => `${v} student${v === 1 ? "" : "s"}`}
                          />
                        }
                      />
                      <Bar
                        dataKey="count"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={64}
                        isAnimationActive={!reduce}
                        animationDuration={700}
                        animationBegin={140}
                      >
                        {stats.data.distribution.map((_, i) => (
                          <Cell key={i} fill={theme.ordinal[i] ?? theme.series} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </motion.div>
          )}

          {/* ---- Item analysis ----
               Questions are NOMINAL, so bar colour must not ramp with bar height
               (that would double-encode magnitude). One series colour, with a
               threshold flag + reference line carrying the actionable read. */}
          {itemRows.length > 0 && (
            <motion.div variants={fadeInUp}>
              <Card>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold text-fg">Item analysis</h2>
                    <p className="text-sm text-fg-muted">
                      Share of attempts answered correctly, per question.
                    </p>
                  </div>
                  <span className="flex items-center gap-1.5 text-xs text-fg-muted">
                    <span className="h-2 w-2 rounded-full" style={{ background: theme.flag }} />
                    Below {Math.round(P_VALUE_FLAG * 100)}% — review
                  </span>
                </div>

                <div className="mt-5 h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      key={theme.mode}
                      data={itemRows.map((r, i) => ({ ...r, label: `Q${i + 1}` }))}
                      // No negative left margin here: the percentage ticks need
                      // the full axis width or "100%" gets clipped to "0%".
                      margin={{ top: 16, right: 8, bottom: 4, left: 0 }}
                    >
                      <CartesianGrid stroke={theme.grid} vertical={false} />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 12, fill: theme.tick }}
                        tickLine={false}
                        axisLine={{ stroke: theme.axis }}
                      />
                      <YAxis
                        domain={[0, 1]}
                        ticks={[0, 0.25, 0.5, 0.75, 1]}
                        tickFormatter={(v: number) => `${Math.round((v ?? 0) * 100)}%`}
                        tick={{ fontSize: 12, fill: theme.tick }}
                        tickLine={false}
                        axisLine={false}
                        width={52}
                      />
                      <Tooltip
                        cursor={{ fill: theme.grid, fillOpacity: 0.45 }}
                        content={
                          <ChartTooltip
                            labelFormatter={(l) => `${l} correct`}
                            formatter={(v) => `${Math.round(v * 100)}%`}
                          />
                        }
                      />
                      <ReferenceLine
                        y={P_VALUE_FLAG}
                        stroke={theme.reference}
                        strokeWidth={1}
                        label={{
                          value: "review threshold",
                          position: "insideTopRight",
                          fill: theme.tick,
                          fontSize: 11,
                        }}
                      />
                      <Bar
                        dataKey="pValue"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={56}
                        isAnimationActive={!reduce}
                        animationDuration={700}
                        animationBegin={140}
                      >
                        {itemRows.map((r, i) => (
                          <Cell
                            key={i}
                            fill={r.pValue !== null && r.pValue < P_VALUE_FLAG ? theme.flag : theme.series}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Table view — every charted value is readable without hovering. */}
                <div className="mt-6 overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-border-subtle text-2xs uppercase tracking-wider text-fg-muted">
                      <tr>
                        <th className="px-3 py-2 font-semibold">Question</th>
                        <th className="px-3 py-2 font-semibold">Attempts</th>
                        <th className="px-3 py-2 font-semibold">Correct</th>
                        <th className="px-3 py-2 font-semibold">Avg. time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {itemRows.map((row, i) => (
                        <tr key={row.questionId} className="border-b border-border-subtle last:border-0">
                          <td className="max-w-md px-3 py-2.5 text-fg-secondary">
                            <span className="font-semibold text-fg">Q{i + 1}.</span> {row.text}
                          </td>
                          <td className="px-3 py-2.5 tabular-nums text-fg-muted">
                            {row.attemptsCount}
                            {row.pendingCount > 0 && (
                              <span className="ml-1 text-2xs text-warning-600 dark:text-warning-500">
                                ({row.pendingCount} ungraded)
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2.5">
                            {row.pValue === null ? (
                              <span className="text-2xs text-fg-muted">awaiting grading</span>
                            ) : (
                              <Badge
                                tone={row.pValue < P_VALUE_FLAG ? "danger" : row.pValue < 0.7 ? "warning" : "success"}
                                size="sm"
                              >
                                {Math.round(row.pValue * 100)}% correct
                              </Badge>
                            )}
                          </td>
                          <td className="px-3 py-2.5 tabular-nums text-fg-muted">{row.avgTimeSpentSec}s</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </motion.div>
          )}

          {attempts.data && attempts.data.length > 0 && (
            <motion.div variants={fadeInUp}>
              <Card padding="none">
                <h2 className="px-5 pt-5 text-base font-semibold text-fg">Attempts</h2>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-y border-border-subtle bg-surface-2 text-2xs uppercase tracking-wider text-fg-muted">
                      <tr>
                        <th className="px-5 py-2.5 font-semibold">Student</th>
                        <th className="px-5 py-2.5 font-semibold">Status</th>
                        <th className="px-5 py-2.5 font-semibold">Score</th>
                        <th className="px-5 py-2.5 font-semibold">Finished</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attempts.data.map((a) => (
                        <tr key={a.attemptId} className="border-b border-border-subtle last:border-0">
                          <td className="px-5 py-3 font-medium text-fg">{a.studentName}</td>
                          <td className="px-5 py-3">
                            <Badge tone={a.status === "EXPIRED" ? "warning" : "success"} size="sm">
                              {a.status === "EXPIRED" ? "Time expired" : "Submitted"}
                            </Badge>
                          </td>
                          <td className="px-5 py-3 tabular-nums text-fg-secondary">{a.score}</td>
                          <td className="px-5 py-3 tabular-nums text-fg-muted">
                            {a.endTime ? new Date(a.endTime).toLocaleString() : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </motion.div>
          )}
        </>
      )}
    </motion.div>
  );
}
