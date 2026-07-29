import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "motion/react";
import clsx from "clsx";
import { api, ApiError } from "../../lib/apiClient";
import { notify } from "../../lib/toast";
import type { ManagedUser, Role } from "../../lib/types";
import { staggerContainer, fadeInUp, duration } from "../../lib/motion";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Icon } from "../../components/ui/Icon";
import { Modal } from "../../components/ui/Modal";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { Field, Input } from "../../components/ui/Field";
import { SkeletonList } from "../../components/ui/Skeleton";
import { EmptyState } from "../../components/ui/EmptyState";

const TABS: { role: Role; label: string }[] = [
  { role: "STUDENT", label: "Students" },
  { role: "STUDY_CENTER", label: "Test Conductors" },
];

export function UserManagementPage() {
  const [role, setRole] = useState<Role>("STUDENT");
  const [showCreate, setShowCreate] = useState(false);
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ManagedUser | null>(null);
  const qc = useQueryClient();

  const users = useQuery({
    queryKey: ["admin", "users", role],
    queryFn: () => api.get<ManagedUser[]>(`/admin/users?role=${role}`),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin", "users", role] });

  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/admin/users/${id}`),
    onSuccess: () => {
      invalidate();
      notify.success("Account deleted");
    },
    onError: (err) =>
      notify.error(
        err instanceof ApiError ? err.message : "Could not delete — the account may still own content or have attempts"
      ),
  });

  const noun = role === "STUDENT" ? "student" : "test conductor";

  return (
    <motion.div variants={staggerContainer(4)} initial="hidden" animate="show" className="flex flex-col gap-6">
      <motion.div variants={fadeInUp} className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-fg">Users</h1>
          <p className="text-sm text-fg-muted">
            Manage student and test-conductor accounts. Test conductors can only be created here.
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)} iconLeft={<Icon name="plus" size={16} />}>
          New {noun}
        </Button>
      </motion.div>

      {/* Segmented control with a sliding indicator */}
      <motion.div variants={fadeInUp}>
        <div
          role="tablist"
          aria-label="Account type"
          className="inline-flex gap-1 rounded-lg border border-border-subtle bg-surface-2 p-1"
        >
          {TABS.map((t) => {
            const active = role === t.role;
            return (
              <button
                key={t.role}
                role="tab"
                aria-selected={active}
                onClick={() => setRole(t.role)}
                className="relative rounded-md px-4 py-1.5 text-sm font-semibold transition-colors"
              >
                {active && (
                  <motion.span
                    layoutId="user-tab"
                    transition={{ duration: duration.base }}
                    className="absolute inset-0 rounded-md bg-surface-1 shadow-e1"
                  />
                )}
                <span className={clsx("relative", active ? "text-fg" : "text-fg-muted hover:text-fg-secondary")}>
                  {t.label}
                </span>
              </button>
            );
          })}
        </div>
      </motion.div>

      {users.isLoading ? (
        <SkeletonList rows={3} />
      ) : !users.data || users.data.length === 0 ? (
        <motion.div variants={fadeInUp}>
          <EmptyState
            icon={<Icon name="users" size={26} />}
            title={`No ${noun}s yet`}
            description={
              role === "STUDENT"
                ? "Students can also register themselves from the sign-in page."
                : "Test conductors author their own subjects, tests, and questions."
            }
            action={<Button onClick={() => setShowCreate(true)}>Create a {noun}</Button>}
          />
        </motion.div>
      ) : (
        <motion.div variants={fadeInUp}>
          <Card padding="none" className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border-subtle bg-surface-2 text-2xs uppercase tracking-wider text-fg-muted">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Name</th>
                    <th className="px-5 py-3 font-semibold">Email</th>
                    <th className="px-5 py-3 font-semibold">City</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {users.data.map((u) => (
                    <tr key={u.id} className="border-b border-border-subtle last:border-0">
                      <td className="px-5 py-3 font-medium text-fg">{u.name}</td>
                      <td className="px-5 py-3 text-fg-secondary">{u.email}</td>
                      <td className="px-5 py-3 text-fg-muted">{u.city ?? "—"}</td>
                      <td className="px-5 py-3">
                        <div className="flex justify-end gap-2">
                          <Button variant="secondary" size="sm" onClick={() => setEditingUser(u)}>
                            Edit
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setPendingDelete(u)}>
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </motion.div>
      )}

      <UserFormModal open={showCreate} role={role} onClose={() => setShowCreate(false)} onSaved={invalidate} />
      <UserFormModal
        open={!!editingUser}
        role={role}
        existingUser={editingUser ?? undefined}
        onClose={() => setEditingUser(null)}
        onSaved={invalidate}
      />

      <ConfirmDialog
        open={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) remove.mutate(pendingDelete.id);
          setPendingDelete(null);
        }}
        title="Delete this account?"
        body={
          <>
            <span className="font-semibold text-fg">{pendingDelete?.name}</span> will lose access immediately. This
            fails if the account still owns subjects, tests, or questions, or has any attempt history.
          </>
        }
        confirmLabel="Delete account"
      />
    </motion.div>
  );
}

function UserFormModal({
  open,
  role,
  existingUser,
  onClose,
  onSaved,
}: {
  open: boolean;
  role: Role;
  existingUser?: ManagedUser;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!existingUser;
  const blank = { name: "", email: "", password: "", contactNo: "", address: "", city: "", pincode: "" };
  const [form, setForm] = useState(blank);

  const seedKey = existingUser?.id ?? "new";
  const [seededFor, setSeededFor] = useState<string | number>(seedKey);
  if (open && seededFor !== seedKey) {
    setSeededFor(seedKey);
    setForm(
      existingUser
        ? {
            name: existingUser.name,
            email: existingUser.email,
            password: "",
            contactNo: existingUser.contactNo ?? "",
            address: existingUser.address ?? "",
            city: existingUser.city ?? "",
            pincode: existingUser.pincode ?? "",
          }
        : blank
    );
  }

  const save = useMutation({
    mutationFn: () =>
      isEdit
        ? api.put(`/admin/users/${existingUser!.id}`, {
            name: form.name,
            contactNo: form.contactNo,
            address: form.address,
            city: form.city,
            pincode: form.pincode,
            ...(form.password ? { newPassword: form.password } : {}),
          })
        : api.post("/admin/users", { ...form, role }),
    onSuccess: () => {
      onSaved();
      onClose();
      notify.success(isEdit ? "Account updated" : "Account created");
    },
    onError: (err) =>
      notify.error(err instanceof ApiError ? err.message : `Could not ${isEdit ? "update" : "create"} account`),
  });

  const set = <K extends keyof typeof form>(key: K, value: string) => setForm((f) => ({ ...f, [key]: value }));
  const noun = role === "STUDENT" ? "student" : "test conductor";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? `Edit ${existingUser?.name}` : `New ${noun}`}
      description={isEdit ? existingUser?.email : undefined}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button form="user-form" type="submit" loading={save.isPending}>
            {isEdit ? "Save changes" : "Create account"}
          </Button>
        </>
      }
    >
      <form
        id="user-form"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
        className="flex flex-col gap-4"
      >
        <Field label="Full name" required>
          {(id) => <Input id={id} required value={form.name} onChange={(e) => set("name", e.target.value)} />}
        </Field>

        {!isEdit && (
          <Field label="Email" required>
            {(id) => (
              <Input id={id} type="email" required value={form.email} onChange={(e) => set("email", e.target.value)} />
            )}
          </Field>
        )}

        <Field
          label={isEdit ? "New password" : "Password"}
          hint={isEdit ? "Leave blank to keep the current password." : "Minimum 8 characters."}
          required={!isEdit}
        >
          {(id) => (
            <Input
              id={id}
              type="password"
              autoComplete="new-password"
              required={!isEdit}
              minLength={8}
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
            />
          )}
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Contact no.">
            {(id) => <Input id={id} value={form.contactNo} onChange={(e) => set("contactNo", e.target.value)} />}
          </Field>
          <Field label="City">
            {(id) => <Input id={id} value={form.city} onChange={(e) => set("city", e.target.value)} />}
          </Field>
        </div>

        {isEdit && (
          <div className="grid grid-cols-2 gap-4">
            <Field label="Address">
              {(id) => <Input id={id} value={form.address} onChange={(e) => set("address", e.target.value)} />}
            </Field>
            <Field label="Pincode">
              {(id) => <Input id={id} value={form.pincode} onChange={(e) => set("pincode", e.target.value)} />}
            </Field>
          </div>
        )}
      </form>
    </Modal>
  );
}
