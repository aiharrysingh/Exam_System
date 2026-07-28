import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "../../lib/apiClient";
import { notify } from "../../lib/toast";
import type { AdminQuestion, QuestionType } from "../../lib/types";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { Field, Input, Textarea } from "../../components/ui/Field";

const TYPE_LABELS: Record<QuestionType, string> = {
  SINGLE_CHOICE: "Single choice",
  MULTI_SELECT: "Multiple select",
  TRUE_FALSE: "True / False",
  SHORT_ANSWER: "Short answer",
};

/**
 * Edits a bank question's core fields and its existing options. Type and option
 * count are fixed once created — changing either would invalidate answers that
 * already reference those options.
 *
 * Always rendered; pass `question={null}` to close. Conditional mounting would
 * skip the exit animation.
 */
export function EditQuestionModal({
  question,
  onClose,
  invalidateKeys,
}: {
  question: AdminQuestion | null;
  onClose: () => void;
  invalidateKeys: unknown[][];
}) {
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [marks, setMarks] = useState(1);
  const [negativeMarks, setNegativeMarks] = useState(0);
  const [allowPartialCredit, setAllowPartialCredit] = useState(false);
  const [options, setOptions] = useState<{ id: number; text: string; isCorrect: boolean }[]>([]);

  // Re-seed local state each time a different question is opened.
  useEffect(() => {
    if (!question) return;
    setText(question.text);
    setMarks(question.marks);
    setNegativeMarks(question.negativeMarks);
    setAllowPartialCredit(question.allowPartialCredit);
    setOptions(question.options.map((o) => ({ id: o.id, text: o.text, isCorrect: !!o.isCorrect })));
  }, [question]);

  const save = useMutation({
    mutationFn: async () => {
      if (!question) return;
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
      invalidateKeys.forEach((key) => qc.invalidateQueries({ queryKey: key }));
      onClose();
      notify.success("Question updated");
    },
    onError: (err) => notify.error(err instanceof ApiError ? err.message : "Could not update question"),
  });

  const isMulti = question?.type === "MULTI_SELECT";
  const showNegative = question?.type === "SINGLE_CHOICE" || question?.type === "TRUE_FALSE";

  function toggleCorrect(i: number) {
    setOptions((opts) =>
      opts.map((o, idx) => (isMulti ? (idx === i ? { ...o, isCorrect: !o.isCorrect } : o) : { ...o, isCorrect: idx === i }))
    );
  }

  return (
    <Modal
      open={!!question}
      onClose={onClose}
      title="Edit question"
      description={question ? `${TYPE_LABELS[question.type]} — type and option count can't be changed` : undefined}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button form="edit-question-form" type="submit" loading={save.isPending}>
            Save changes
          </Button>
        </>
      }
    >
      <form
        id="edit-question-form"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
        className="flex flex-col gap-4"
      >
        <Field label="Question" required>
          {(id) => <Textarea id={id} required rows={3} value={text} onChange={(e) => setText(e.target.value)} />}
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Marks" required>
            {(id) => (
              <Input id={id} type="number" min={1} value={marks} onChange={(e) => setMarks(Number(e.target.value))} />
            )}
          </Field>
          {showNegative && (
            <Field label="Negative marks" hint="Applied only when answered incorrectly.">
              {(id) => (
                <Input
                  id={id}
                  type="number"
                  min={0}
                  value={negativeMarks}
                  onChange={(e) => setNegativeMarks(Number(e.target.value))}
                />
              )}
            </Field>
          )}
        </div>

        {isMulti && (
          <label className="flex items-center gap-2 text-sm font-medium text-fg-secondary">
            <input
              type="checkbox"
              checked={allowPartialCredit}
              onChange={(e) => setAllowPartialCredit(e.target.checked)}
              className="accent-brand-600"
            />
            Award partial credit for partially-correct selections
          </label>
        )}

        {options.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold text-fg-secondary">
              {isMulti ? "Options — check every correct one" : "Options — select the correct one"}
            </p>
            {options.map((o, i) => (
              <div key={o.id} className="flex items-center gap-2.5">
                <input
                  type={isMulti ? "checkbox" : "radio"}
                  name="correct-option"
                  checked={o.isCorrect}
                  onChange={() => toggleCorrect(i)}
                  aria-label={`Mark option ${i + 1} correct`}
                  className="accent-brand-600"
                />
                <Input
                  required
                  aria-label={`Option ${i + 1}`}
                  value={o.text}
                  onChange={(e) =>
                    setOptions((opts) => opts.map((opt, idx) => (idx === i ? { ...opt, text: e.target.value } : opt)))
                  }
                />
              </div>
            ))}
          </div>
        )}
      </form>
    </Modal>
  );
}
