import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { api, ApiError } from "../../lib/apiClient";
import { notify } from "../../lib/toast";
import type { AdminTest, Subject } from "../../lib/types";
import { staggerContainer, fadeInUp, duration } from "../../lib/motion";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Icon } from "../../components/ui/Icon";
import { Modal } from "../../components/ui/Modal";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { Field, Input, Select, Textarea } from "../../components/ui/Field";
import { SkeletonList } from "../../components/ui/Skeleton";
import { EmptyState } from "../../components/ui/EmptyState";

function toLocalInput(dt: string) {
  return new Date(dt).toISOString().slice(0, 16);
}

export function AdminTestsPage() {
  const qc = useQueryClient();
  const tests = useQuery({ queryKey: ["admin", "tests"], queryFn: () => api.get<AdminTest[]>("/tests") });
  const subjects = useQuery({ queryKey: ["subjects"], queryFn: () => api.get<Subject[]>("/subjects") });
  const [showCreate, setShowCreate] = useState(false);
  const [editingTest, setEditingTest] = useState<AdminTest | null>(null);
  const [pendingDelete, setPendingDelete] = useState<AdminTest | null>(null);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin", "tests"] });

  const publish = useMutation({
    mutationFn: (id: number) => api.post(`/tests/${id}/publish`),
    onSuccess: () => {
      invalidate();
      notify.success("Test published — students can see it now");
    },
    onError: (err) => notify.error(err instanceof ApiError ? err.message : "Could not publish test"),
  });

  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/tests/${id}`),
    onMutate: async (id: number) => {
      await qc.cancelQueries({ queryKey: ["admin", "tests"] });
      const prev = qc.getQueryData<AdminTest[]>(["admin", "tests"]);
      qc.setQueryData<AdminTest[]>(["admin", "tests"], (old) => old?.filter((t) => t.id !== id));
      return { prev };
    },
    onError: (err, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(["admin", "tests"], ctx.prev);
      notify.error(err instanceof ApiError ? err.message : "Could not delete test");
    },
    onSuccess: () => notify.success("Test deleted"),
    onSettled: invalidate,
  });

  const noSubjects = !subjects.isLoading && (subjects.data?.length ?? 0) === 0;

  return (
    <motion.div variants={staggerContainer(4)} initial="hidden" animate="show" className="flex flex-col gap-6">
      <motion.div variants={fadeInUp} className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-fg">Tests</h1>
          <p className="text-sm text-fg-muted">Create a test, add questions, then publish it.</p>
        </div>
        <Button onClick={() => setShowCreate(true)} disabled={noSubjects} iconLeft={<Icon name="plus" size={16} />}>
          New test
        </Button>
      </motion.div>

      {tests.isLoading || subjects.isLoading ? (
        <SkeletonList rows={3} />
      ) : noSubjects ? (
        <motion.div variants={fadeInUp}>
          <EmptyState
            icon={<Icon name="book" size={26} />}
            title="Create a subject first"
            description="Every test belongs to a subject, so you'll need at least one before you can create a test."
            action={
              <Link to="/manage/subjects">
                <Button>Go to Subjects</Button>
              </Link>
            }
          />
        </motion.div>
      ) : !tests.data || tests.data.length === 0 ? (
        <motion.div variants={fadeInUp}>
          <EmptyState
            icon={<Icon name="list" size={26} />}
            title="No tests yet"
            description="Create your first test, attach some questions, and publish it for students."
            action={<Button onClick={() => setShowCreate(true)}>Create a test</Button>}
          />
        </motion.div>
      ) : (
        <div className="flex flex-col gap-3">
          <AnimatePresence initial={false}>
            {tests.data.map((t) => (
              <motion.div
                key={t.id}
                layout
                variants={fadeInUp}
                initial="hidden"
                animate="show"
                exit={{ opacity: 0, height: 0, marginBottom: -12, transition: { duration: duration.base } }}
              >
                <Card className="flex flex-wrap items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-fg">{t.name}</p>
                      {t.isPractice && (
                        <Badge tone="brand" size="sm">
                          Practice
                        </Badge>
                      )}
                      <Badge tone={t.isPublished ? "success" : "neutral"} size="sm" dot>
                        {t.isPublished ? "Published" : "Draft"}
                      </Badge>
                      {t.poolSize && (
                        <Badge tone="accent" size="sm">
                          Pool of {t.poolSize}
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-fg-muted">
                      {t.subject.name} · code <span className="font-mono">{t.code}</span> · {t.durationMin} min ·{" "}
                      {t.totalQuestions} question{t.totalQuestions === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link to={`/manage/tests/${t.id}/questions`}>
                      <Button variant="secondary" size="sm">
                        Questions
                      </Button>
                    </Link>
                    <Button variant="secondary" size="sm" onClick={() => setEditingTest(t)}>
                      Edit
                    </Button>
                    {!t.isPublished && (
                      <Button size="sm" onClick={() => publish.mutate(t.id)} loading={publish.isPending}>
                        Publish
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => setPendingDelete(t)}>
                      Delete
                    </Button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {subjects.data && (
        <>
          <TestFormModal
            open={showCreate}
            subjects={subjects.data}
            onClose={() => setShowCreate(false)}
            onSaved={invalidate}
          />
          <TestFormModal
            open={!!editingTest}
            subjects={subjects.data}
            existingTest={editingTest ?? undefined}
            onClose={() => setEditingTest(null)}
            onSaved={invalidate}
          />
        </>
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) remove.mutate(pendingDelete.id);
          setPendingDelete(null);
        }}
        title="Delete this test?"
        body="Its questions stay in your bank, but the test itself and any attempt history are removed permanently."
        confirmLabel="Delete test"
        // Typed confirmation — deleting a test with attempt history is unrecoverable.
        requireTyped={pendingDelete?.name}
      />
    </motion.div>
  );
}

function TestFormModal({
  open,
  subjects,
  existingTest,
  onClose,
  onSaved,
}: {
  open: boolean;
  subjects: Subject[];
  existingTest?: AdminTest;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!existingTest;
  const now = new Date();
  const inAWeek = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 7);

  const blank = {
    name: "",
    description: "",
    code: "",
    subjectId: subjects[0]?.id ?? 0,
    durationMin: 20,
    isPractice: false,
    shuffleQuestions: false,
    poolSize: "",
    availableFrom: toLocalInput(now.toISOString()),
    availableTo: toLocalInput(inAWeek.toISOString()),
  };

  const [form, setForm] = useState(blank);

  // Re-seed when a different test is opened for editing.
  const seedKey = existingTest?.id ?? "new";
  const [seededFor, setSeededFor] = useState<string | number>(seedKey);
  if (open && seededFor !== seedKey) {
    setSeededFor(seedKey);
    setForm(
      existingTest
        ? {
            name: existingTest.name,
            description: existingTest.description ?? "",
            code: existingTest.code,
            subjectId: existingTest.subject.id,
            durationMin: existingTest.durationMin,
            isPractice: existingTest.isPractice,
            shuffleQuestions: existingTest.shuffleQuestions,
            poolSize: existingTest.poolSize ? String(existingTest.poolSize) : "",
            availableFrom: toLocalInput(existingTest.availableFrom),
            availableTo: toLocalInput(existingTest.availableTo),
          }
        : blank
    );
  }

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        ...form,
        subjectId: Number(form.subjectId),
        durationMin: Number(form.durationMin),
        poolSize: form.poolSize ? Number(form.poolSize) : null,
        availableFrom: new Date(form.availableFrom).toISOString(),
        availableTo: new Date(form.availableTo).toISOString(),
      };
      return isEdit ? api.put(`/tests/${existingTest!.id}`, payload) : api.post("/tests", payload);
    },
    onSuccess: () => {
      onSaved();
      onClose();
      notify.success(isEdit ? "Test updated" : "Test created");
    },
    onError: (err) =>
      notify.error(err instanceof ApiError ? err.message : `Could not ${isEdit ? "update" : "create"} test`),
  });

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit test" : "New test"}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button form="test-form" type="submit" loading={save.isPending}>
            {isEdit ? "Save changes" : "Create test"}
          </Button>
        </>
      }
    >
      <form
        id="test-form"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
        className="flex flex-col gap-4"
      >
        <Field label="Test name" required>
          {(id) => <Input id={id} required value={form.name} onChange={(e) => set("name", e.target.value)} />}
        </Field>

        <Field label="Description">
          {(id) => (
            <Textarea id={id} rows={2} value={form.description} onChange={(e) => set("description", e.target.value)} />
          )}
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Subject" required>
            {(id) => (
              <Select id={id} value={form.subjectId} onChange={(e) => set("subjectId", Number(e.target.value))}>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Test code" hint="Students enter this to begin." required>
            {(id) => <Input id={id} required value={form.code} onChange={(e) => set("code", e.target.value)} />}
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Duration (minutes)" required>
            {(id) => (
              <Input
                id={id}
                type="number"
                min={1}
                required
                value={form.durationMin}
                onChange={(e) => set("durationMin", Number(e.target.value))}
              />
            )}
          </Field>
          <label className="flex items-center gap-2 self-end pb-3 text-sm font-medium text-fg-secondary">
            <input
              type="checkbox"
              checked={form.isPractice}
              onChange={(e) => set("isPractice", e.target.checked)}
              className="accent-brand-600"
            />
            Practice test
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Available from">
            {(id) => (
              <Input
                id={id}
                type="datetime-local"
                value={form.availableFrom}
                onChange={(e) => set("availableFrom", e.target.value)}
              />
            )}
          </Field>
          <Field label="Available to">
            {(id) => (
              <Input
                id={id}
                type="datetime-local"
                value={form.availableTo}
                onChange={(e) => set("availableTo", e.target.value)}
              />
            )}
          </Field>
        </div>

        <fieldset className="rounded-lg border border-border-subtle p-4">
          <legend className="px-1.5 text-xs font-semibold text-fg-secondary">Randomization</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex items-start gap-2 text-sm font-medium text-fg-secondary">
              <input
                type="checkbox"
                checked={form.shuffleQuestions}
                onChange={(e) => set("shuffleQuestions", e.target.checked)}
                className="mt-0.5 accent-brand-600"
              />
              Shuffle question order for each attempt
            </label>
            <Field label="Question pool size" hint="Blank uses every attached question.">
              {(id) => (
                <Input
                  id={id}
                  type="number"
                  min={1}
                  value={form.poolSize}
                  onChange={(e) => set("poolSize", e.target.value)}
                />
              )}
            </Field>
          </div>
        </fieldset>
      </form>
    </Modal>
  );
}
