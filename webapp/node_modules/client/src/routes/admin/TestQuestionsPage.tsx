import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { api, ApiError } from "../../lib/apiClient";
import type { AdminQuestion, AdminTest, QuestionType } from "../../lib/types";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { FullPageSpinner } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";
import { EditQuestionModal } from "./EditQuestionModal";

const TYPE_LABELS: Record<QuestionType, string> = {
  SINGLE_CHOICE: "Single choice",
  MULTI_SELECT: "Multiple select",
  TRUE_FALSE: "True / False",
  SHORT_ANSWER: "Short answer",
};

export function TestQuestionsPage() {
  const { testId } = useParams();
  const qc = useQueryClient();
  const test = useQuery({ queryKey: ["admin", "tests", testId], queryFn: () => api.get<AdminTest>(`/tests/${testId}`) });
  const questions = useQuery({
    queryKey: ["admin", "tests", testId, "questions"],
    queryFn: () => api.get<AdminQuestion[]>(`/tests/${testId}/questions`),
  });
  const [showNewForm, setShowNewForm] = useState(false);
  const [showBankPicker, setShowBankPicker] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<AdminQuestion | null>(null);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin", "tests", testId, "questions"] });

  const detach = useMutation({
    mutationFn: (testQuestionId: number) => api.delete(`/tests/${testId}/questions/${testQuestionId}`),
    onSuccess: invalidate,
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not remove question"),
  });

  if (test.isLoading || questions.isLoading || !test.data) return <FullPageSpinner />;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link to="/manage/tests" className="text-sm font-semibold text-brand-600 dark:text-brand-400">
          ← Back to tests
        </Link>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{test.data.name}</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {questions.data?.length ?? 0} questions · code {test.data.code}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setShowBankPicker(true)}>
              Add from bank
            </Button>
            <Button onClick={() => setShowNewForm(true)}>Create new question</Button>
          </div>
        </div>
      </div>

      {!questions.data || questions.data.length === 0 ? (
        <EmptyState title="No questions yet" description="Add at least one question before publishing this test." />
      ) : (
        <div className="flex flex-col gap-4">
          {questions.data.map((q, i) => (
            <Card key={q.testQuestionId ?? q.id} className="flex flex-col gap-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-slate-900 dark:text-white">
                      {i + 1}. {q.text}
                    </p>
                    <Badge tone="neutral">{TYPE_LABELS[q.type]}</Badge>
                  </div>
                  <p className="text-xs text-slate-400">
                    {q.marks} marks{q.negativeMarks > 0 && ` · -${q.negativeMarks} if wrong`}
                    {q.allowPartialCredit && " · partial credit"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => setEditingQuestion(q)}>
                    Edit
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => window.confirm("Remove this question from the test?") && detach.mutate(q.testQuestionId!)}
                  >
                    Detach
                  </Button>
                </div>
              </div>
              {q.type === "SHORT_ANSWER" ? (
                <p className="text-sm italic text-slate-400">Free-text answer, manually graded</p>
              ) : (
                <ul className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300">
                  {q.options.map((o) => (
                    <li key={o.id} className={o.isCorrect ? "font-semibold text-emerald-600 dark:text-emerald-400" : ""}>
                      {o.isCorrect ? "✓ " : "· "}
                      {o.text}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          ))}
        </div>
      )}

      {showNewForm && (
        <NewQuestionModal testId={Number(testId)} onClose={() => setShowNewForm(false)} onCreated={invalidate} />
      )}
      {showBankPicker && (
        <BankPickerModal testId={Number(testId)} onClose={() => setShowBankPicker(false)} onAttached={invalidate} />
      )}
      {editingQuestion && (
        <EditQuestionModal
          question={editingQuestion}
          onClose={() => setEditingQuestion(null)}
          invalidateKeys={[["admin", "tests", testId, "questions"], ["questions", "bank"]]}
        />
      )}
    </div>
  );
}

function NewQuestionModal({ testId, onClose, onCreated }: { testId: number; onClose: () => void; onCreated: () => void }) {
  const [type, setType] = useState<QuestionType>("SINGLE_CHOICE");
  const [text, setText] = useState("");
  const [marks, setMarks] = useState(1);
  const [negativeMarks, setNegativeMarks] = useState(0);
  const [allowPartialCredit, setAllowPartialCredit] = useState(false);
  const [tagsInput, setTagsInput] = useState("");
  const [options, setOptions] = useState([
    { text: "", isCorrect: true },
    { text: "", isCorrect: false },
  ]);

  const needsOptions = type !== "SHORT_ANSWER";
  const isMulti = type === "MULTI_SELECT";
  const effectiveOptions = type === "TRUE_FALSE" ? [{ text: "True", isCorrect: true }, { text: "False", isCorrect: false }] : options;

  const create = useMutation({
    mutationFn: () =>
      api.post(`/tests/${testId}/questions`, {
        type,
        text,
        marks,
        negativeMarks: type === "SINGLE_CHOICE" || type === "TRUE_FALSE" ? negativeMarks : 0,
        allowPartialCredit: isMulti ? allowPartialCredit : false,
        tags: tagsInput.split(",").map((t) => t.trim()).filter(Boolean),
        options: needsOptions
          ? (type === "TRUE_FALSE" ? effectiveOptions : options).map((o, i) => ({ ...o, order: i + 1 }))
          : undefined,
      }),
    onSuccess: () => {
      onCreated();
      onClose();
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not create question"),
  });

  function setOptionText(i: number, value: string) {
    setOptions((opts) => opts.map((o, idx) => (idx === i ? { ...o, text: value } : o)));
  }

  function toggleCorrect(i: number) {
    setOptions((opts) => opts.map((o, idx) => (isMulti ? (idx === i ? { ...o, isCorrect: !o.isCorrect } : o) : { ...o, isCorrect: idx === i })));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <Card className="max-h-[90vh] w-full max-w-lg overflow-y-auto">
        <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">Create new question</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (needsOptions && type !== "TRUE_FALSE") {
              if (options.filter((o) => o.text.trim()).length < 2) {
                toast.error("Add at least 2 options");
                return;
              }
              if (!options.some((o) => o.isCorrect)) {
                toast.error("Mark at least one option as correct");
                return;
              }
            }
            create.mutate();
          }}
          className="flex flex-col gap-4"
        >
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-500 dark:text-slate-400">
            Question type
            <select
              value={type}
              onChange={(e) => setType(e.target.value as QuestionType)}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              {Object.entries(TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <textarea
            required
            placeholder="Question text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />

          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-500 dark:text-slate-400">
              Marks
              <input
                type="number"
                min={1}
                value={marks}
                onChange={(e) => setMarks(Number(e.target.value))}
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </label>
            {(type === "SINGLE_CHOICE" || type === "TRUE_FALSE") && (
              <label className="flex flex-col gap-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                Negative marks (if wrong)
                <input
                  type="number"
                  min={0}
                  value={negativeMarks}
                  onChange={(e) => setNegativeMarks(Number(e.target.value))}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </label>
            )}
          </div>

          {isMulti && (
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              <input type="checkbox" checked={allowPartialCredit} onChange={(e) => setAllowPartialCredit(e.target.checked)} />
              Allow partial credit for partially-correct selections
            </label>
          )}

          <label className="flex flex-col gap-1 text-xs font-medium text-slate-500 dark:text-slate-400">
            Tags (comma-separated, optional)
            <input
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="e.g. security, basics"
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </label>

          {type === "TRUE_FALSE" && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Options are fixed to True / False — mark which one is correct when reviewing the question list.
            </p>
          )}

          {needsOptions && type !== "TRUE_FALSE" && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {isMulti ? "Options (check every correct one)" : "Options (select the radio next to the correct one)"}
              </p>
              {options.map((o, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type={isMulti ? "checkbox" : "radio"}
                    name="correct"
                    checked={o.isCorrect}
                    onChange={() => toggleCorrect(i)}
                  />
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
          )}

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

function BankPickerModal({ testId, onClose, onAttached }: { testId: number; onClose: () => void; onAttached: () => void }) {
  const bank = useQuery({ queryKey: ["questions", "bank"], queryFn: () => api.get<AdminQuestion[]>("/questions") });
  const qc = useQueryClient();

  const attach = useMutation({
    mutationFn: (questionId: number) => api.post(`/tests/${testId}/questions`, { questionId }),
    onSuccess: () => {
      onAttached();
      qc.invalidateQueries({ queryKey: ["questions", "bank"] });
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not attach question"),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <Card className="max-h-[80vh] w-full max-w-xl overflow-y-auto">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Add from your question bank</h2>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
        {bank.isLoading ? (
          <FullPageSpinner />
        ) : !bank.data || bank.data.length === 0 ? (
          <EmptyState title="Your bank is empty" description="Create a question or import a CSV to build up a reusable bank." />
        ) : (
          <div className="flex flex-col gap-2">
            {bank.data.map((q) => (
              <div key={q.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                <div>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{q.text}</p>
                  <p className="text-xs text-slate-400">
                    {TYPE_LABELS[q.type]} · {q.marks} marks
                  </p>
                </div>
                <Button onClick={() => attach.mutate(q.id)} disabled={attach.isPending}>
                  Add
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
