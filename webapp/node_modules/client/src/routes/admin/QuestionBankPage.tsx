import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { api, ApiError } from "../../lib/apiClient";
import { notify } from "../../lib/toast";
import type { AdminQuestion, QuestionType } from "../../lib/types";
import { staggerContainer, fadeInUp, duration } from "../../lib/motion";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Icon } from "../../components/ui/Icon";
import { Input, Select } from "../../components/ui/Field";
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

const CSV_TEMPLATE = `text,type,marks,negativeMarks,allowPartialCredit,option1,option2,option3,option4,correctOptions,tags
"What does CPU stand for?",SINGLE_CHOICE,1,0,,Central Processing Unit,Computer Processing Unit,Central Program Unit,Core Processing Unit,1,hardware;basics
"Select all prime numbers",MULTI_SELECT,3,0,true,2,3,4,9,1;2,math
"The Earth is flat.",TRUE_FALSE,1,0,,True,False,,,2,science
"Explain what an index does in a database.",SHORT_ANSWER,3,0,,,,,,,databases
`;

export function QuestionBankPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["questions", "bank"], queryFn: () => api.get<AdminQuestion[]>("/questions") });
  const fileInput = useRef<HTMLInputElement>(null);
  const [editingQuestion, setEditingQuestion] = useState<AdminQuestion | null>(null);
  const [pendingDelete, setPendingDelete] = useState<AdminQuestion | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<QuestionType | "">("");

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    return data.filter(
      (item) =>
        (!typeFilter || item.type === typeFilter) &&
        (!q || item.text.toLowerCase().includes(q) || item.tags?.some((t) => t.name.toLowerCase().includes(q)))
    );
  }, [data, search, typeFilter]);

  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/questions/${id}`),
    onMutate: async (id: number) => {
      await qc.cancelQueries({ queryKey: ["questions", "bank"] });
      const prev = qc.getQueryData<AdminQuestion[]>(["questions", "bank"]);
      qc.setQueryData<AdminQuestion[]>(["questions", "bank"], (old) => old?.filter((x) => x.id !== id));
      return { prev };
    },
    onError: (err, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(["questions", "bank"], ctx.prev);
      notify.error(
        err instanceof ApiError ? err.message : "Could not delete — the question may be attached to a test"
      );
    },
    onSuccess: () => notify.success("Question deleted"),
    onSettled: () => qc.invalidateQueries({ queryKey: ["questions", "bank"] }),
  });

  const upload = useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return api.upload<{ created: number }>("/questions/csv-import", formData);
    },
    onSuccess: (res) => {
      notify.success(`Imported ${res.created} question${res.created === 1 ? "" : "s"}`);
      qc.invalidateQueries({ queryKey: ["questions", "bank"] });
    },
    onError: (err) => notify.error(err instanceof ApiError ? err.message : "CSV import failed"),
  });

  function downloadTemplate() {
    const blob = new Blob([CSV_TEMPLATE], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "question-bank-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <motion.div variants={staggerContainer(4)} initial="hidden" animate="show" className="flex flex-col gap-6">
      <motion.div variants={fadeInUp}>
        <h1 className="text-2xl font-bold tracking-tight text-fg">Question Bank</h1>
        <p className="text-sm text-fg-muted">Reusable questions you can attach to any of your tests.</p>
      </motion.div>

      <motion.div variants={fadeInUp}>
        <Card className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-fg">Bulk import from CSV</p>
            <p className="mt-0.5 text-xs text-fg-muted">
              Columns: text, type, marks, negativeMarks, allowPartialCredit, option1–6, correctOptions (;-separated),
              tags (;-separated). Import is all-or-nothing.
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button variant="secondary" onClick={downloadTemplate}>
              Template
            </Button>
            <input
              ref={fileInput}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) upload.mutate(file);
                e.target.value = "";
              }}
            />
            <Button
              onClick={() => fileInput.current?.click()}
              loading={upload.isPending}
              iconLeft={<Icon name="upload" size={16} />}
            >
              Import CSV
            </Button>
          </div>
        </Card>
      </motion.div>

      {data && data.length > 0 && (
        <motion.div variants={fadeInUp} className="flex flex-col gap-3 sm:flex-row">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search questions and tags…"
            aria-label="Search questions"
            className="flex-1"
          />
          <Select
            aria-label="Filter by type"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as QuestionType | "")}
            className="sm:w-56"
          >
            <option value="">All types</option>
            {Object.entries(TYPE_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
        </motion.div>
      )}

      {isLoading ? (
        <SkeletonList rows={4} />
      ) : !data || data.length === 0 ? (
        <motion.div variants={fadeInUp}>
          <EmptyState
            icon={<Icon name="bank" size={26} />}
            title="Your bank is empty"
            description="Create questions from a test's Questions page, or bulk-import a CSV above."
            action={
              <Button onClick={() => fileInput.current?.click()} iconLeft={<Icon name="upload" size={16} />}>
                Import CSV
              </Button>
            }
          />
        </motion.div>
      ) : filtered.length === 0 ? (
        <motion.div variants={fadeInUp}>
          <EmptyState
            variant="compact"
            icon={<Icon name="bank" size={20} />}
            title="No questions match"
            description="Try a different search term or type filter."
          />
        </motion.div>
      ) : (
        <div className="flex flex-col gap-3">
          <AnimatePresence initial={false}>
            {filtered.map((q) => (
              <motion.div
                key={q.id}
                layout
                variants={fadeInUp}
                initial="hidden"
                animate="show"
                exit={{ opacity: 0, height: 0, marginBottom: -12, transition: { duration: duration.base } }}
              >
                <Card className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-fg">{q.text}</p>
                      <Badge tone="neutral" size="sm">
                        {TYPE_LABELS[q.type]}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-fg-muted">
                      {q.marks} mark{q.marks === 1 ? "" : "s"}
                      {q.negativeMarks > 0 && ` · −${q.negativeMarks} if wrong`}
                      {q.allowPartialCredit && " · partial credit"}
                    </p>
                    {q.tags && q.tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {q.tags.map((t) => (
                          <Badge key={t.id} tone="accent" size="sm">
                            {t.name}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button variant="secondary" size="sm" onClick={() => setEditingQuestion(q)}>
                      Edit
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setPendingDelete(q)}>
                      Delete
                    </Button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <EditQuestionModal
        question={editingQuestion}
        onClose={() => setEditingQuestion(null)}
        invalidateKeys={[["questions", "bank"]]}
      />

      <ConfirmDialog
        open={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) remove.mutate(pendingDelete.id);
          setPendingDelete(null);
        }}
        title="Delete this question?"
        body="It will be removed from your bank. This fails if the question is attached to a test or already has attempt history."
        confirmLabel="Delete question"
      />
    </motion.div>
  );
}
