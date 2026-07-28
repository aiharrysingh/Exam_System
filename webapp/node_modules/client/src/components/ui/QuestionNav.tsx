import clsx from "clsx";
import type { AnswerState, SummaryItem } from "../../lib/types";

const stateStyles: Record<AnswerState, string> = {
  UNANSWERED: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
  ANSWERED: "bg-emerald-500 text-white",
  MARKED_FOR_REVIEW: "bg-amber-500 text-white",
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
    <div className="flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400">
      <span className="flex items-center gap-1.5">
        <span className="h-3 w-3 rounded bg-slate-200 dark:bg-slate-700" /> Unanswered
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-3 w-3 rounded bg-emerald-500" /> Answered
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-3 w-3 rounded bg-amber-500" /> Marked for review
      </span>
    </div>
  );
}
