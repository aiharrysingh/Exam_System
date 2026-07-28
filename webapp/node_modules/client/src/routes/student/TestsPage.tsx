import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { api, ApiError } from "../../lib/apiClient";
import { notify } from "../../lib/toast";
import type { TestSummary } from "../../lib/types";
import { staggerContainer, fadeInUp } from "../../lib/motion";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { Icon } from "../../components/ui/Icon";
import { Field, Input } from "../../components/ui/Field";
import { SkeletonList } from "../../components/ui/Skeleton";
import { EmptyState } from "../../components/ui/EmptyState";

export function TestsPage() {
  const { data: tests, isLoading } = useQuery({ queryKey: ["tests"], queryFn: () => api.get<TestSummary[]>("/tests") });
  const [activeTest, setActiveTest] = useState<TestSummary | null>(null);

  return (
    <motion.div variants={staggerContainer(4)} initial="hidden" animate="show" className="flex flex-col gap-6">
      <motion.div variants={fadeInUp}>
        <h1 className="text-2xl font-bold tracking-tight text-fg">Available Tests</h1>
        <p className="text-sm text-fg-muted">
          Tests you haven't attempted yet, within their availability window.
        </p>
      </motion.div>

      {isLoading ? (
        <SkeletonList rows={3} />
      ) : !tests || tests.length === 0 ? (
        <motion.div variants={fadeInUp}>
          <EmptyState
            icon={<Icon name="inbox" size={26} />}
            title="Nothing to take right now"
            description="New tests appear here as soon as they're published and inside their availability window."
          />
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tests.map((t) => (
            <motion.div key={t.id} variants={fadeInUp}>
              <Card className="flex h-full flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-fg">{t.name}</h3>
                  {t.isPractice && (
                    <Badge tone="brand" size="sm">
                      Practice
                    </Badge>
                  )}
                </div>
                {t.description && <p className="text-sm text-fg-muted">{t.description}</p>}
                <dl className="mt-auto flex flex-col gap-1.5 pt-2 text-xs text-fg-muted">
                  <div className="flex items-center gap-2">
                    <Icon name="book" size={14} />
                    {t.subject.name}
                  </div>
                  <div className="flex items-center gap-2">
                    <Icon name="clock" size={14} />
                    {t.durationMin} minutes · {t.totalQuestions} questions
                  </div>
                </dl>
                <Button onClick={() => setActiveTest(t)} className="mt-2 w-full">
                  Start test
                </Button>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Modal owns its own AnimatePresence, so it stays mounted and takes `open`. */}
      <StartTestModal test={activeTest} onClose={() => setActiveTest(null)} />
    </motion.div>
  );
}

function StartTestModal({ test, onClose }: { test: TestSummary | null; onClose: () => void }) {
  const [code, setCode] = useState("");
  const navigate = useNavigate();
  const qc = useQueryClient();

  const start = useMutation({
    mutationFn: () => api.post<{ attemptId: number }>(`/tests/${test!.id}/start`, { code }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["tests"] });
      qc.invalidateQueries({ queryKey: ["attempts", "in-progress"] });
      navigate(`/attempts/${res.attemptId}`);
    },
    onError: (err) => notify.error(err instanceof ApiError ? err.message : "Could not start test"),
  });

  return (
    <Modal
      open={!!test}
      onClose={() => {
        setCode("");
        onClose();
      }}
      title={test ? `Start "${test.name}"` : ""}
      description={
        test
          ? `Once you begin, the ${test.durationMin}-minute timer runs server-side and cannot be paused.`
          : undefined
      }
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button form="start-test-form" type="submit" loading={start.isPending}>
            Start test
          </Button>
        </>
      }
    >
      <form
        id="start-test-form"
        onSubmit={(e) => {
          e.preventDefault();
          start.mutate();
        }}
      >
        <Field label="Test code" hint="Provided by your instructor." required>
          {(id) => (
            <Input
              id={id}
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. PROG101"
              autoComplete="off"
            />
          )}
        </Field>
      </form>
    </Modal>
  );
}
