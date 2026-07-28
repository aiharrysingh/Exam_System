import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { api, ApiError } from "../../lib/apiClient";
import type { AdminQuestion, AdminTest } from "../../lib/types";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { FullPageSpinner } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";

export function TestQuestionsPage() {
  const { testId } = useParams();
  const qc = useQueryClient();
  const test = useQuery({ queryKey: ["admin", "tests", testId], queryFn: () => api.get<AdminTest>(`/tests/${testId}`) });
  const questions = useQuery({
    queryKey: ["admin", "tests", testId, "questions"],
    queryFn: () => api.get<AdminQuestion[]>(`/tests/${testId}/questions`),
  });
  const [showForm, setShowForm] = useState(false);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin", "tests", testId, "questions"] });

  const removeQuestion = useMutation({
    mutationFn: (id: number) => api.delete(`/questions/${id}`),
    onSuccess: invalidate,
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not delete question"),
  });

  if (test.isLoading || questions.isLoading || !test.data) return <FullPageSpinner />;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link to="/admin/tests" className="text-sm font-semibold text-brand-600 dark:text-brand-400">
          ← Back to tests
        </Link>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{test.data.name}</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {questions.data?.length ?? 0} questions · code {test.data.code}
            </p>
          </div>
          <Button onClick={() => setShowForm(true)}>Add question</Button>
        </div>
      </div>

      {!questions.data || questions.data.length === 0 ? (
        <EmptyState title="No questions yet" description="Add at least one question before publishing this test." />
      ) : (
        <div className="flex flex-col gap-4">
          {questions.data.map((q, i) => (
            <Card key={q.id} className="flex flex-col gap-2">
              <div className="flex items-start justify-between gap-3">
                <p className="font-medium text-slate-900 dark:text-white">
                  {i + 1}. {q.text} <span className="text-xs font-normal text-slate-400">({q.marks} marks)</span>
                </p>
                <Button
                  variant="danger"
                  onClick={() => window.confirm("Delete this question?") && removeQuestion.mutate(q.id)}
                >
                  Delete
                </Button>
              </div>
              <ul className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300">
                {q.options.map((o) => (
                  <li key={o.id} className={o.isCorrect ? "font-semibold text-emerald-600 dark:text-emerald-400" : ""}>
                    {o.isCorrect ? "✓ " : "· "}
                    {o.text}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      )}

      {showForm && (
        <NewQuestionModal
          testId={Number(testId)}
          onClose={() => setShowForm(false)}
          onCreated={invalidate}
        />
      )}
    </div>
  );
}

function NewQuestionModal({
  testId,
  onClose,
  onCreated,
}: {
  testId: number;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [text, setText] = useState("");
  const [marks, setMarks] = useState(1);
  const [options, setOptions] = useState([
    { text: "", isCorrect: true },
    { text: "", isCorrect: false },
  ]);

  const create = useMutation({
    mutationFn: () => api.post(`/tests/${testId}/questions`, { text, marks, options }),
    onSuccess: () => {
      onCreated();
      onClose();
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not create question"),
  });

  function setOptionText(i: number, value: string) {
    setOptions((opts) => opts.map((o, idx) => (idx === i ? { ...o, text: value } : o)));
  }

  function setCorrect(i: number) {
    setOptions((opts) => opts.map((o, idx) => ({ ...o, isCorrect: idx === i })));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <Card className="w-full max-w-lg">
        <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">New question</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (options.filter((o) => o.text.trim()).length < 2) {
              toast.error("Add at least 2 options");
              return;
            }
            if (!options.some((o) => o.isCorrect)) {
              toast.error("Mark one option as correct");
              return;
            }
            create.mutate();
          }}
          className="flex flex-col gap-4"
        >
          <textarea
            required
            placeholder="Question text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-500 dark:text-slate-400">
            Marks
            <input
              type="number"
              min={1}
              value={marks}
              onChange={(e) => setMarks(Number(e.target.value))}
              className="w-24 rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </label>

          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Options (select the radio next to the correct one)
            </p>
            {options.map((o, i) => (
              <div key={i} className="flex items-center gap-2">
                <input type="radio" name="correct" checked={o.isCorrect} onChange={() => setCorrect(i)} />
                <input
                  required
                  placeholder={`Option ${i + 1}`}
                  value={o.text}
                  onChange={(e) => setOptionText(i, e.target.value)}
                  className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
                {options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => setOptions((opts) => opts.filter((_, idx) => idx !== i))}
                    className="text-slate-400 hover:text-rose-500"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            <Button
              type="button"
              variant="secondary"
              className="self-start"
              onClick={() => setOptions((opts) => [...opts, { text: "", isCorrect: false }])}
            >
              + Add option
            </Button>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={create.isPending}>
              Add question
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
