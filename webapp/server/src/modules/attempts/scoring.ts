type ScorableQuestion = {
  type: string;
  marks: number;
  negativeMarks: number;
  allowPartialCredit: boolean;
  options: { id: number; isCorrect: boolean }[];
};

type ScorableAnswer = {
  textResponse: string | null;
  selections: { optionId: number }[];
};

/**
 * The single place "is this answer right" is computed anywhere in the app.
 * Returns the marks to award, or null when the answer isn't gradable yet
 * (a non-blank SHORT_ANSWER awaiting a human).
 */
export function scoreAnswer(question: ScorableQuestion, answer: ScorableAnswer): number | null {
  if (question.type === "SHORT_ANSWER") {
    if (!answer.textResponse?.trim()) return 0;
    return null; // pending manual review
  }

  const selectedIds = new Set(answer.selections.map((s) => s.optionId));
  const correctIds = new Set(question.options.filter((o) => o.isCorrect).map((o) => o.id));

  if (question.type === "SINGLE_CHOICE" || question.type === "TRUE_FALSE") {
    if (selectedIds.size === 0) return 0; // unanswered is never penalized
    const [only] = selectedIds;
    return correctIds.has(only) ? question.marks : -question.negativeMarks;
  }

  // MULTI_SELECT
  if (!question.allowPartialCredit) {
    const exact = selectedIds.size === correctIds.size && [...selectedIds].every((id) => correctIds.has(id));
    return exact ? question.marks : 0;
  }
  if (correctIds.size === 0) return 0;
  const correctSelected = [...selectedIds].filter((id) => correctIds.has(id)).length;
  const incorrectSelected = selectedIds.size - correctSelected;
  const raw = (correctSelected - incorrectSelected) / correctIds.size;
  return Math.max(0, raw) * question.marks;
}
