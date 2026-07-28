import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api, ApiError } from "../../lib/apiClient";
import type { AdminQuestion } from "../../lib/types";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";

const TYPE_LABELS: Record<string, string> = {
  SINGLE_CHOICE: "Single choice",
  MULTI_SELECT: "Multiple select",
  TRUE_FALSE: "True / False",
  SHORT_ANSWER: "Short answer",
};

/** Shared by TestQuestionsPage and QuestionBankPage — editing a bank question's
 * core fields and (for choice-based types) its existing options. Type and option
 * count are fixed once created; recreate the question to change either. */
export function EditQuestionModal({
  question,
  onClose,
  invalidateKeys,
}: {
  question: AdminQuestion;
  onClose: () => void;
  invalidateKeys: unknown[][];
}) {
  const qc = useQueryClient();
  const [text, setText] = useState(question.text);
  const [marks, setMarks] = useState(question.marks);
  const [negativeMarks, setNegativeMarks] = useState(question.negativeMarks);
  const [allowPartialCredit, setAllowPartialCredit] = useState(question.allowPartialCredit);
  const [options, setOptions] = useState(question.options.map((o) => ({ id: o.id, text: o.text, isCorrect: !!o.isCorrect })));

  const invalidateAll = () => invalidateKeys.forEach((key) => qc.invalidateQueries({ queryKey: key }));

  const save = useMutation({
    mutationFn: async () => {
      await api.put(`/questions/${question.id}`, {
        text,
        marks,
        negativeMarks: question.type === "SINGLE_CHOICE" || question.type === "TRUE_FALSE" ? negativeMarks : 0,
        allowPartialCredit: question.type === "MULTI_SELECT" ? allowPartialCredit : false,
      });
      for (const o of options) {
        await api.put(`/options/${o.id}`, { text: o.text, isCorrect: o.isCorrect });
      }
    },
    onSuccess: () => {
      invalidateAll();
      onClose();
      toast.success("Question updated");
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not update question"),
  });

  const isMulti = question.type === "MULTI_SELECT";

  function toggleCorrect(i: number) {
    setOptions((opts) => opts.map((o, idx) => (isMulti ? (idx === i ? { ...o, isCorrect: !o.isCorrect } : o) : { ...o, isCorrect: idx === i })));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <Card className="max-h-[90vh] w-full max-w-lg overflow-y-auto">
        <h2 className="mb-1 text-lg font-semibold text-slate-900 dark:text-white">Edit question</h2>
        <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">{TYPE_LABELS[question.type]} (type can't be changed)</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
          className="flex flex-col gap-4"
        >
          <textarea
            required
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
            {(question.type === "SINGLE_CHOICE" || question.type === "TRUE_FALSE") && (
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

          {options.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {isMulti ? "Options (check every correct one)" : "Options (select the correct one)"}
              </p>
              {options.map((o, i) => (
                <div key={o.id} className="flex items-center gap-2">
                  <input type={isMulti ? "checkbox" : "radio"} name="correct" checked={o.isCorrect} onChange={() => toggleCorrect(i)} />
                  <input
                    required
                    value={o.text}
                    onChange={(e) => setOptions((opts) => opts.map((opt, idx) => (idx === i ? { ...opt, text: e.target.value } : opt)))}
                    className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={save.isPending}>
              Save changes
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
