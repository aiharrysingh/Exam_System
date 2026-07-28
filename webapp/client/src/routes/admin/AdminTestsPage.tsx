import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { api, ApiError } from "../../lib/apiClient";
import type { AdminTest, Subject } from "../../lib/types";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { FullPageSpinner } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";

function toLocalInput(dt: string) {
  return new Date(dt).toISOString().slice(0, 16);
}

export function AdminTestsPage() {
  const qc = useQueryClient();
  const tests = useQuery({ queryKey: ["admin", "tests"], queryFn: () => api.get<AdminTest[]>("/tests") });
  const subjects = useQuery({ queryKey: ["subjects"], queryFn: () => api.get<Subject[]>("/subjects") });
  const [showForm, setShowForm] = useState(false);
  const [editingTest, setEditingTest] = useState<AdminTest | null>(null);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin", "tests"] });

  const publish = useMutation({
    mutationFn: (id: number) => api.post(`/tests/${id}/publish`),
    onSuccess: invalidate,
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not publish test"),
  });

  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/tests/${id}`),
    onSuccess: invalidate,
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not delete test"),
  });

  if (tests.isLoading || subjects.isLoading) return <FullPageSpinner />;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Tests</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Create tests, then add questions before publishing.</p>
        </div>
        <Button onClick={() => setShowForm(true)}>New test</Button>
      </div>

      {!tests.data || tests.data.length === 0 ? (
        <EmptyState title="No tests yet" description="Create your first test to get started." />
      ) : (
        <div className="flex flex-col gap-3">
          {tests.data.map((t) => (
            <Card key={t.id} className="flex flex-wrap items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-slate-900 dark:text-white">{t.name}</p>
                  {t.isPractice && <Badge tone="brand">Practice</Badge>}
                  <Badge tone={t.isPublished ? "success" : "neutral"}>{t.isPublished ? "Published" : "Draft"}</Badge>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t.subject.name} · code {t.code} · {t.durationMin} min · {t.totalQuestions} questions
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link to={`/manage/tests/${t.id}/questions`}>
                  <Button variant="secondary">Questions</Button>
                </Link>
                <Button variant="secondary" onClick={() => setEditingTest(t)}>
                  Edit
                </Button>
                {!t.isPublished && (
                  <Button onClick={() => publish.mutate(t.id)} disabled={publish.isPending}>
                    Publish
                  </Button>
                )}
                <Button
                  variant="danger"
                  onClick={() => window.confirm(`Delete "${t.name}"?`) && remove.mutate(t.id)}
                  disabled={remove.isPending}
                >
                  Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {showForm && subjects.data && (
        <TestFormModal subjects={subjects.data} onClose={() => setShowForm(false)} onSaved={invalidate} />
      )}
      {editingTest && subjects.data && (
        <TestFormModal
          subjects={subjects.data}
          existingTest={editingTest}
          onClose={() => setEditingTest(null)}
          onSaved={invalidate}
        />
      )}
    </div>
  );
}

function TestFormModal({
  subjects,
  existingTest,
  onClose,
  onSaved,
}: {
  subjects: Subject[];
  existingTest?: AdminTest;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!existingTest;
  const now = new Date();
  const inAWeek = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 7);
  const [form, setForm] = useState({
    name: existingTest?.name ?? "",
    description: existingTest?.description ?? "",
    code: existingTest?.code ?? "",
    subjectId: existingTest?.subject.id ?? subjects[0]?.id ?? 0,
    durationMin: existingTest?.durationMin ?? 20,
    isPractice: existingTest?.isPractice ?? false,
    shuffleQuestions: existingTest?.shuffleQuestions ?? false,
    poolSize: existingTest?.poolSize ? String(existingTest.poolSize) : "",
    availableFrom: toLocalInput(existingTest?.availableFrom ?? now.toISOString()),
    availableTo: toLocalInput(existingTest?.availableTo ?? inAWeek.toISOString()),
  });

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
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : `Could not ${isEdit ? "update" : "create"} test`),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <Card className="max-h-[90vh] w-full max-w-lg overflow-y-auto">
        <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">{isEdit ? "Edit test" : "New test"}</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
          className="flex flex-col gap-4"
        >
          <input
            required
            placeholder="Test name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
          <textarea
            placeholder="Description (optional)"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
          <div className="grid grid-cols-2 gap-4">
            <select
              value={form.subjectId}
              onChange={(e) => setForm({ ...form, subjectId: Number(e.target.value) })}
              className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <input
              required
              placeholder="Test code"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-500 dark:text-slate-400">
              Duration (minutes)
              <input
                type="number"
                min={1}
                required
                value={form.durationMin}
                onChange={(e) => setForm({ ...form, durationMin: Number(e.target.value) })}
                className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </label>
            <label className="flex items-center gap-2 self-end pb-2.5 text-sm font-medium text-slate-700 dark:text-slate-200">
              <input
                type="checkbox"
                checked={form.isPractice}
                onChange={(e) => setForm({ ...form, isPractice: e.target.checked })}
              />
              Practice test (ungraded warm-up)
            </label>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-500 dark:text-slate-400">
              Available from
              <input
                type="datetime-local"
                value={form.availableFrom}
                onChange={(e) => setForm({ ...form, availableFrom: e.target.value })}
                className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-500 dark:text-slate-400">
              Available to
              <input
                type="datetime-local"
                value={form.availableTo}
                onChange={(e) => setForm({ ...form, availableTo: e.target.value })}
                className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </label>
          </div>
          <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
            <p className="mb-2 text-xs font-semibold text-slate-500 dark:text-slate-400">Randomization (optional)</p>
            <div className="grid grid-cols-2 gap-4">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                <input
                  type="checkbox"
                  checked={form.shuffleQuestions}
                  onChange={(e) => setForm({ ...form, shuffleQuestions: e.target.checked })}
                />
                Shuffle question order per attempt
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                Question pool size (blank = use all)
                <input
                  type="number"
                  min={1}
                  value={form.poolSize}
                  onChange={(e) => setForm({ ...form, poolSize: e.target.value })}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {isEdit ? "Save changes" : "Create test"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
