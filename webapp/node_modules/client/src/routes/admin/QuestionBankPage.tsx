import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api, ApiError } from "../../lib/apiClient";
import type { AdminQuestion, QuestionType } from "../../lib/types";
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

const CSV_TEMPLATE = `text,type,marks,negativeMarks,allowPartialCredit,option1,option2,option3,option4,correctOptions,tags
"What does CPU stand for?",SINGLE_CHOICE,1,0,,Central Processing Unit,Computer Processing Unit,Central Program Unit,Core Processing Unit,1,hardware;basics
"Select all prime numbers",MULTI_SELECT,3,0,true,2,3,4,9,1;2,math
`;

export function QuestionBankPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["questions", "bank"], queryFn: () => api.get<AdminQuestion[]>("/questions") });
  const fileInput = useRef<HTMLInputElement>(null);
  const [editingQuestion, setEditingQuestion] = useState<AdminQuestion | null>(null);

  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/questions/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["questions", "bank"] }),
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not delete — it may be attached to a test"),
  });

  const upload = useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return api.upload<{ created: number }>("/questions/csv-import", formData);
    },
    onSuccess: (res) => {
      toast.success(`Imported ${res.created} question${res.created === 1 ? "" : "s"}`);
      qc.invalidateQueries({ queryKey: ["questions", "bank"] });
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "CSV import failed"),
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

  if (isLoading) return <FullPageSpinner />;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Question Bank</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Reusable questions you can attach to any of your tests.</p>
      </div>

      <Card className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Bulk import from CSV</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Columns: text, type, marks, negativeMarks, allowPartialCredit, option1-6, correctOptions (;-separated), tags (;-separated)
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={downloadTemplate}>
            Download template
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
          <Button onClick={() => fileInput.current?.click()} disabled={upload.isPending}>
            {upload.isPending ? "Importing..." : "Import CSV"}
          </Button>
        </div>
      </Card>

      {!data || data.length === 0 ? (
        <EmptyState title="Your bank is empty" description="Create questions from a test's Questions page, or import a CSV above." />
      ) : (
        <div className="flex flex-col gap-3">
          {data.map((q) => (
            <Card key={q.id} className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-slate-800 dark:text-slate-100">{q.text}</p>
                  <Badge tone="neutral">{TYPE_LABELS[q.type]}</Badge>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {q.marks} marks
                  {q.tags && q.tags.length > 0 && ` · ${q.tags.map((t) => t.name).join(", ")}`}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setEditingQuestion(q)}>
                  Edit
                </Button>
                <Button
                  variant="danger"
                  onClick={() => window.confirm("Delete this bank question?") && remove.mutate(q.id)}
                  disabled={remove.isPending}
                >
                  Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {editingQuestion && (
        <EditQuestionModal
          question={editingQuestion}
          onClose={() => setEditingQuestion(null)}
          invalidateKeys={[["questions", "bank"]]}
        />
      )}
    </div>
  );
}
