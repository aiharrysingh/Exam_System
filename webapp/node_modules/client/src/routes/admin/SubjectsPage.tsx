import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api, ApiError } from "../../lib/apiClient";
import type { Subject } from "../../lib/types";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { FullPageSpinner } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";

export function SubjectsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["subjects"], queryFn: () => api.get<Subject[]>("/subjects") });
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<Subject | null>(null);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["subjects"] });

  const create = useMutation({
    mutationFn: () => api.post<Subject>("/subjects", { name }),
    onSuccess: () => {
      setName("");
      invalidate();
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not create subject"),
  });

  const update = useMutation({
    mutationFn: (s: Subject) => api.put<Subject>(`/subjects/${s.id}`, { name: s.name }),
    onSuccess: () => {
      setEditing(null);
      invalidate();
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not update subject"),
  });

  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/subjects/${id}`),
    onSuccess: invalidate,
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : "Could not delete subject — it may still have tests attached"),
  });

  if (isLoading) return <FullPageSpinner />;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Subjects</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Group tests by subject area.</p>
      </div>

      <Card>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) create.mutate();
          }}
          className="flex gap-3"
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="New subject name"
            className="flex-1 rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
          <Button type="submit" disabled={create.isPending}>
            Add subject
          </Button>
        </form>
      </Card>

      {!data || data.length === 0 ? (
        <EmptyState title="No subjects yet" description="Add your first subject above." />
      ) : (
        <div className="flex flex-col gap-3">
          {data.map((s) => (
            <Card key={s.id} className="flex items-center justify-between gap-3">
              {editing?.id === s.id ? (
                <input
                  autoFocus
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  onKeyDown={(e) => e.key === "Enter" && update.mutate(editing)}
                  className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              ) : (
                <div>
                  <p className="font-medium text-slate-800 dark:text-slate-100">{s.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {s.testCount ?? 0} test{s.testCount === 1 ? "" : "s"} · {s.questionCount ?? 0} question
                    {s.questionCount === 1 ? "" : "s"}
                  </p>
                </div>
              )}
              <div className="flex gap-2">
                {editing?.id === s.id ? (
                  <>
                    <Button variant="secondary" onClick={() => setEditing(null)}>
                      Cancel
                    </Button>
                    <Button onClick={() => update.mutate(editing)} disabled={update.isPending}>
                      Save
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="secondary" onClick={() => setEditing(s)}>
                      Rename
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => window.confirm(`Delete "${s.name}"?`) && remove.mutate(s.id)}
                      disabled={remove.isPending}
                    >
                      Delete
                    </Button>
                  </>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
