import clsx from "clsx";
import type { AnswerState, SummaryItem } from "../../lib/types";

const stateStyles: Record<AnswerState, string> = {
  UNANSWERED: "bg-surface-3 text-fg-muted",
  ANSWERED: "bg-success-500 text-white",
  MARKED_FOR_REVIEW: "bg-warning-500 text-white",
};

export function QuestionNav({
  items,
  currentOrder,
  onSelect,
}: {
  items: SummaryItem[];
  currentOrder?: number;
  onSelect: (order: number) => void;
}) {
  return (
    <div className="grid grid-cols-5 gap-2 sm:grid-cols-6">
      {items.map((item) => (
        <button
          key={item.questionId}
          onClick={() => onSelect(item.order)}
          className={clsx(
            "flex h-10 w-10 items-center justify-center rounded-lg text-sm font-semibold transition ring-offset-2",
            stateStyles[item.state],
            currentOrder === item.order && "ring-2 ring-brand-500"
          )}
        >
          {item.order}
        </button>
      ))}
    </div>
  );
}

export function QuestionNavLegend() {
  return (
    <div className="flex flex-wrap gap-3 text-xs text-fg-muted">
      <span className="flex items-center gap-1.5">
        <span className="h-3 w-3 rounded bg-surface-3" /> Unanswered
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-3 w-3 rounded bg-success-500" /> Answered
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-3 w-3 rounded bg-warning-500" /> Marked for review
      </span>
    </div>
  );
}
