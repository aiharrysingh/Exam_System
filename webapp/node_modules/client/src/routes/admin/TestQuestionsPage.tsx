import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import clsx from "clsx";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { restrictToParentElement, restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { CSS } from "@dnd-kit/utilities";
import { api, ApiError } from "../../lib/apiClient";
import { notify } from "../../lib/toast";
import type { AdminQuestion, AdminTest, QuestionType } from "../../lib/types";
import { duration, fadeInUp, staggerContainer } from "../../lib/motion";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Icon } from "../../components/ui/Icon";
import { Field, Input, Select, Textarea } from "../../components/ui/Field";
import { Modal } from "../../components/ui/Modal";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { SkeletonList } from "../../components/ui/Skeleton";
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
  const questionsKey = ["admin", "tests", testId, "questions"];
  const test = useQuery({ queryKey: ["admin", "tests", testId], queryFn: () => api.get<AdminTest>(`/tests/${testId}`) });
  const questions = useQuery({
    queryKey: questionsKey,
    queryFn: () => api.get<AdminQuestion[]>(`/tests/${testId}/questions`),
  });
  const [showNewForm, setShowNewForm] = useState(false);
  const [showBankPicker, setShowBankPicker] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<AdminQuestion | null>(null);
  const [pendingDetach, setPendingDetach] = useState<AdminQuestion | null>(null);

  const invalidate = () => qc.invalidateQueries({ queryKey: questionsKey });

  const detach = useMutation({
    mutationFn: (testQuestionId: number) => api.delete(`/tests/${testId}/questions/${testQuestionId}`),
    onSuccess: () => {
      invalidate();
      notify.success("Question removed from test");
    },
    onError: (err) => notify.error(err instanceof ApiError ? err.message : "Could not remove question"),
  });

  const reorder = useMutation({
    mutationFn: (orderedIds: number[]) => api.put(`/tests/${testId}/questions/order`, { order: orderedIds }),
    onMutate: async (orderedIds: number[]) => {
      await qc.cancelQueries({ queryKey: questionsKey });
      const prev = qc.getQueryData<AdminQuestion[]>(questionsKey);
      const byId = new Map(prev?.map((q) => [q.testQuestionId, q]));
      qc.setQueryData<AdminQuestion[]>(
        questionsKey,
        orderedIds.map((id, i) => ({ ...byId.get(id)!, order: i + 1 }))
      );
      return { prev };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(questionsKey, ctx.prev);
      notify.error(err instanceof ApiError ? err.message : "Could not save the new order");
    },
    onSettled: invalidate,
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    // Ignore drops while a reorder is already saving — dragging over a stale
    // list would compute the move against positions that no longer apply.
    if (!over || active.id === over.id || !questions.data || reorder.isPending) return;
    const ids = questions.data.map((q) => q.testQuestionId!);
    const oldIndex = ids.indexOf(active.id as number);
    const newIndex = ids.indexOf(over.id as number);
    if (oldIndex === -1 || newIndex === -1) return;
    reorder.mutate(arrayMove(ids, oldIndex, newIndex));
  }

  if (test.isLoading || questions.isLoading || !test.data) return <SkeletonList rows={5} />;

  const list = questions.data ?? [];

  return (
    <motion.div variants={staggerContainer(4)} initial="hidden" animate="show" className="flex flex-col gap-6">
      <motion.div variants={fadeInUp}>
        <Link to="/manage/tests" className="text-sm font-semibold text-brand-600 dark:text-brand-400">
          ← Back to tests
        </Link>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-fg">{test.data.name}</h1>
            <p className="text-sm text-fg-muted">
              {list.length} question{list.length === 1 ? "" : "s"} · code {test.data.code}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setShowBankPicker(true)} iconLeft={<Icon name="bank" size={16} />}>
              Add from bank
            </Button>
            <Button onClick={() => setShowNewForm(true)} iconLeft={<Icon name="plus" size={16} />}>
              Create new question
            </Button>
          </div>
        </div>
      </motion.div>

      {list.length === 0 ? (
        <motion.div variants={fadeInUp}>
          <EmptyState
            icon={<Icon name="list" size={26} />}
            title="No questions yet"
            description="Add at least one question before publishing this test. Drag the handle to reorder once you have a few."
            action={
              <Button onClick={() => setShowNewForm(true)} iconLeft={<Icon name="plus" size={16} />}>
                Create new question
              </Button>
            }
          />
        </motion.div>
      ) : (
        <motion.div variants={fadeInUp}>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
            modifiers={[restrictToVerticalAxis, restrictToParentElement]}
          >
            <SortableContext items={list.map((q) => q.testQuestionId!)} strategy={verticalListSortingStrategy}>
              <div className="flex flex-col gap-3">
                <AnimatePresence initial={false}>
                  {list.map((q, i) => (
                    <SortableQuestionRow
                      key={q.testQuestionId}
                      question={q}
                      index={i}
                      onEdit={() => setEditingQuestion(q)}
                      onDetach={() => setPendingDetach(q)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </SortableContext>
          </DndContext>
        </motion.div>
      )}

      {showNewForm && (
        <NewQuestionModal testId={Number(testId)} onClose={() => setShowNewForm(false)} onCreated={invalidate} />
      )}
      {showBankPicker && (
        <BankPickerModal testId={Number(testId)} onClose={() => setShowBankPicker(false)} onAttached={invalidate} />
      )}
      {/* Always mounted — conditional mounting would skip the exit animation. */}
      <EditQuestionModal
        question={editingQuestion}
        onClose={() => setEditingQuestion(null)}
        invalidateKeys={[questionsKey, ["questions", "bank"]]}
      />

      <ConfirmDialog
        open={!!pendingDetach}
        onClose={() => setPendingDetach(null)}
        onConfirm={() => {
          if (pendingDetach) detach.mutate(pendingDetach.testQuestionId!);
          setPendingDetach(null);
        }}
        title="Remove this question from the test?"
        body="It stays in your question bank and can be re-attached later. The remaining questions renumber automatically."
        confirmLabel="Remove question"
      />
    </motion.div>
  );
}

function SortableQuestionRow({
  question: q,
  index,
  onEdit,
  onDetach,
}: {
  question: AdminQuestion;
  index: number;
  onEdit: () => void;
  onDetach: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: q.testQuestionId!,
  });

  return (
    <motion.div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      variants={fadeInUp}
      initial="hidden"
      animate="show"
      exit={{ opacity: 0, height: 0, marginBottom: -12, transition: { duration: duration.base } }}
      className={clsx(isDragging && "relative z-10")}
    >
      <Card className={clsx("flex items-start gap-3", isDragging && "shadow-e4 ring-2 ring-brand-500/30")}>
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`Drag to reorder question ${index + 1}`}
          className="mt-0.5 shrink-0 touch-none rounded-md p-1.5 text-fg-muted transition-colors hover:bg-surface-3 hover:text-fg active:cursor-grabbing"
          style={{ cursor: isDragging ? "grabbing" : "grab" }}
        >
          <Icon name="grip" size={16} />
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-medium text-fg">
              {index + 1}. {q.text}
            </p>
            <Badge tone="neutral" size="sm">
              {TYPE_LABELS[q.type]}
            </Badge>
          </div>
          <p className="mt-0.5 text-xs text-fg-muted">
            {q.marks} mark{q.marks === 1 ? "" : "s"}
            {q.negativeMarks > 0 && ` · −${q.negativeMarks} if wrong`}
            {q.allowPartialCredit && " · partial credit"}
          </p>
          {q.type === "SHORT_ANSWER" ? (
            <p className="mt-2 text-sm italic text-fg-muted">Free-text answer, manually graded</p>
          ) : (
            <ul className="mt-2 flex flex-col gap-1 text-sm text-fg-secondary">
              {q.options.map((o) => (
                <li key={o.id} className={clsx("flex items-center gap-1.5", o.isCorrect && "font-semibold text-success-700 dark:text-success-500")}>
                  {o.isCorrect ? <Icon name="check" size={14} className="shrink-0" /> : <span className="ml-0.5 h-1 w-1 shrink-0 rounded-full bg-current" />}
                  {o.text}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex shrink-0 gap-2">
          <Button variant="secondary" size="sm" onClick={onEdit}>
            Edit
          </Button>
          <Button variant="ghost" size="sm" onClick={onDetach}>
            Detach
          </Button>
        </div>
      </Card>
    </motion.div>
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
      notify.success("Question added");
    },
    onError: (err) => notify.error(err instanceof ApiError ? err.message : "Could not create question"),
  });

  function setOptionText(i: number, value: string) {
    setOptions((opts) => opts.map((o, idx) => (idx === i ? { ...o, text: value } : o)));
  }

  function toggleCorrect(i: number) {
    setOptions((opts) => opts.map((o, idx) => (isMulti ? (idx === i ? { ...o, isCorrect: !o.isCorrect } : o) : { ...o, isCorrect: idx === i })));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (needsOptions && type !== "TRUE_FALSE") {
      if (options.filter((o) => o.text.trim()).length < 2) {
        notify.error("Add at least 2 options");
        return;
      }
      if (!options.some((o) => o.isCorrect)) {
        notify.error("Mark at least one option as correct");
        return;
      }
    }
    create.mutate();
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Create new question"
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button form="new-question-form" type="submit" loading={create.isPending}>
            Add question
          </Button>
        </>
      }
    >
      <form id="new-question-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="Question type">
          {(id) => (
            <Select id={id} value={type} onChange={(e) => setType(e.target.value as QuestionType)}>
              {Object.entries(TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          )}
        </Field>

        <Field label="Question" required>
          {(id) => <Textarea id={id} required rows={3} value={text} onChange={(e) => setText(e.target.value)} />}
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Marks" required>
            {(id) => (
              <Input id={id} type="number" min={1} value={marks} onChange={(e) => setMarks(Number(e.target.value))} />
            )}
          </Field>
          {(type === "SINGLE_CHOICE" || type === "TRUE_FALSE") && (
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
            <input type="checkbox" checked={allowPartialCredit} onChange={(e) => setAllowPartialCredit(e.target.checked)} className="accent-brand-600" />
            Allow partial credit for partially-correct selections
          </label>
        )}

        <Field label="Tags" hint="Comma-separated, optional">
          {(id) => <Input id={id} value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="e.g. security, basics" />}
        </Field>

        {type === "TRUE_FALSE" && (
          <p className="text-xs text-fg-muted">Options are fixed to True / False — mark which one is correct when reviewing the question list.</p>
        )}

        {needsOptions && type !== "TRUE_FALSE" && (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold text-fg-secondary">
              {isMulti ? "Options — check every correct one" : "Options — select the radio next to the correct one"}
            </p>
            {options.map((o, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <input
                  type={isMulti ? "checkbox" : "radio"}
                  name="correct"
                  checked={o.isCorrect}
                  onChange={() => toggleCorrect(i)}
                  aria-label={`Mark option ${i + 1} correct`}
                  className="accent-brand-600"
                />
                <Input
                  required
                  aria-label={`Option ${i + 1}`}
                  placeholder={`Option ${i + 1}`}
                  value={o.text}
                  onChange={(e) => setOptionText(i, e.target.value)}
                />
                {options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => setOptions((opts) => opts.filter((_, idx) => idx !== i))}
                    aria-label={`Remove option ${i + 1}`}
                    className="shrink-0 rounded-md p-1.5 text-fg-muted hover:bg-surface-3 hover:text-danger-600"
                  >
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="self-start"
              onClick={() => setOptions((opts) => [...opts, { text: "", isCorrect: false }])}
              iconLeft={<Icon name="plus" size={14} />}
            >
              Add option
            </Button>
          </div>
        )}
      </form>
    </Modal>
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
      notify.success("Question attached");
    },
    onError: (err) => notify.error(err instanceof ApiError ? err.message : "Could not attach question"),
  });

  return (
    <Modal open onClose={onClose} title="Add from your question bank" size="lg">
      {bank.isLoading ? (
        <SkeletonList rows={3} />
      ) : !bank.data || bank.data.length === 0 ? (
        <EmptyState
          variant="compact"
          icon={<Icon name="bank" size={20} />}
          title="Your bank is empty"
          description="Create a question or import a CSV to build up a reusable bank."
        />
      ) : (
        <div className="flex flex-col gap-2">
          {bank.data.map((q) => (
            <div key={q.id} className="flex items-center justify-between gap-3 rounded-lg border border-border-subtle p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-fg">{q.text}</p>
                <p className="text-xs text-fg-muted">
                  {TYPE_LABELS[q.type]} · {q.marks} mark{q.marks === 1 ? "" : "s"}
                </p>
              </div>
              <Button size="sm" onClick={() => attach.mutate(q.id)} disabled={attach.isPending}>
                Add
              </Button>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
