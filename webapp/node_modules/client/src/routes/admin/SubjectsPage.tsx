import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { api, ApiError } from "../../lib/apiClient";
import { notify } from "../../lib/toast";
import type { Subject } from "../../lib/types";
import { staggerContainer, fadeInUp, duration } from "../../lib/motion";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Icon } from "../../components/ui/Icon";
import { Input } from "../../components/ui/Field";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { SkeletonList } from "../../components/ui/Skeleton";
import { EmptyState } from "../../components/ui/EmptyState";

export function SubjectsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["subjects"], queryFn: () => api.get<Subject[]>("/subjects") });
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<Subject | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Subject | null>(null);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["subjects"] });

  const create = useMutation({
    mutationFn: () => api.post<Subject>("/subjects", { name }),
    onSuccess: () => {
      setName("");
      invalidate();
      notify.success("Subject created");
    },
    onError: (err) => notify.error(err instanceof ApiError ? err.message : "Could not create subject"),
  });

  const update = useMutation({
    mutationFn: (s: Subject) => api.put<Subject>(`/subjects/${s.id}`, { name: s.name }),
    onSuccess: () => {
      setEditing(null);
      invalidate();
      notify.success("Subject renamed");
    },
    onError: (err) => notify.error(err instanceof ApiError ? err.message : "Could not update subject"),
  });

  const remove = useMutation({
    // Optimistic: drop the row immediately so its exit animation plays now,
    // instead of lingering until the refetch lands.
    mutationFn: (id: number) => api.delete(`/subjects/${id}`),
    onMutate: async (id: number) => {
      await qc.cancelQueries({ queryKey: ["subjects"] });
      const prev = qc.getQueryData<Subject[]>(["subjects"]);
      qc.setQueryData<Subject[]>(["subjects"], (old) => old?.filter((s) => s.id !== id));
      return { prev };
    },
    onError: (err, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(["subjects"], ctx.prev);
      notify.error(
        err instanceof ApiError ? err.message : "Could not delete — the subject may still have tests attached"
      );
    },
    onSuccess: () => notify.success("Subject deleted"),
    onSettled: () => invalidate(),
  });

  return (
    <motion.div variants={staggerContainer(4)} initial="hidden" animate="show" className="flex flex-col gap-6">
      <motion.div variants={fadeInUp}>
        <h1 className="text-2xl font-bold tracking-tight text-fg">Subjects</h1>
        <p className="text-sm text-fg-muted">Group tests by subject area.</p>
      </motion.div>

      <motion.div variants={fadeInUp}>
        <Card>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (name.trim()) create.mutate();
            }}
            className="flex flex-col gap-3 sm:flex-row"
          >
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="New subject name"
              aria-label="New subject name"
              className="flex-1"
            />
            <Button type="submit" loading={create.isPending} iconLeft={<Icon name="plus" size={16} />}>
              Add subject
            </Button>
          </form>
        </Card>
      </motion.div>

      {isLoading ? (
        <SkeletonList rows={3} />
      ) : !data || data.length === 0 ? (
        <motion.div variants={fadeInUp}>
          <EmptyState
            icon={<Icon name="book" size={26} />}
            title="No subjects yet"
            description="Subjects group your tests. Add your first one above to get started."
          />
        </motion.div>
      ) : (
        <div className="flex flex-col gap-3">
          <AnimatePresence initial={false}>
            {data.map((s) => (
              <motion.div
                key={s.id}
                layout
                variants={fadeInUp}
                initial="hidden"
                animate="show"
                exit={{ opacity: 0, height: 0, marginBottom: -12, transition: { duration: duration.base } }}
              >
                <Card className="flex flex-wrap items-center justify-between gap-3">
                  <AnimatePresence mode="wait" initial={false}>
                    {editing?.id === s.id ? (
                      <motion.div
                        key="edit"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: duration.fast }}
                        className="flex-1"
                      >
                        <Input
                          autoFocus
                          aria-label="Subject name"
                          value={editing.name}
                          onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") update.mutate(editing);
                            if (e.key === "Escape") setEditing(null);
                          }}
                        />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="view"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: duration.fast }}
                      >
                        <p className="font-medium text-fg">{s.name}</p>
                        <p className="text-xs text-fg-muted">
                          {s.testCount ?? 0} test{s.testCount === 1 ? "" : "s"} · {s.questionCount ?? 0} question
                          {s.questionCount === 1 ? "" : "s"}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="flex gap-2">
                    {editing?.id === s.id ? (
                      <>
                        <Button variant="secondary" size="sm" onClick={() => setEditing(null)}>
                          Cancel
                        </Button>
                        <Button size="sm" onClick={() => update.mutate(editing)} loading={update.isPending}>
                          Save
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button variant="secondary" size="sm" onClick={() => setEditing(s)}>
                          Rename
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setPendingDelete(s)}>
                          Delete
                        </Button>
                      </>
                    )}
                  </div>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) remove.mutate(pendingDelete.id);
          setPendingDelete(null);
        }}
        title="Delete subject?"
        body={
          <>
            <span className="font-semibold text-fg">{pendingDelete?.name}</span> will be removed. This can't be undone,
            and it will fail if any tests still belong to it.
          </>
        }
        confirmLabel="Delete subject"
      />
    </motion.div>
  );
}
