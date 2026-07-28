import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api, ApiError } from "../../lib/apiClient";
import type { ManagedUser, Role } from "../../lib/types";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { FullPageSpinner } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";

const TABS: { role: Role; label: string }[] = [
  { role: "STUDENT", label: "Students" },
  { role: "STUDY_CENTER", label: "Test Conductors" },
];

export function UserManagementPage() {
  const [role, setRole] = useState<Role>("STUDENT");
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const qc = useQueryClient();

  const users = useQuery({
    queryKey: ["admin", "users", role],
    queryFn: () => api.get<ManagedUser[]>(`/admin/users?role=${role}`),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin", "users", role] });

  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/admin/users/${id}`),
    onSuccess: invalidate,
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not delete this account"),
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Users</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Manage student and test-conductor accounts.</p>
        </div>
        <Button onClick={() => setShowForm(true)}>New {role === "STUDENT" ? "student" : "test conductor"}</Button>
      </div>

      <div className="flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.role}
            onClick={() => setRole(t.role)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              role === t.role
                ? "bg-brand-600 text-white"
                : "bg-white text-slate-600 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {users.isLoading ? (
        <FullPageSpinner />
      ) : !users.data || users.data.length === 0 ? (
        <EmptyState title="No accounts yet" />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-800 dark:text-slate-400">
              <tr>
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3">City</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {users.data.map((u) => (
                <tr key={u.id} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
                  <td className="px-5 py-3 font-medium text-slate-800 dark:text-slate-100">{u.name}</td>
                  <td className="px-5 py-3 text-slate-500 dark:text-slate-400">{u.email}</td>
                  <td className="px-5 py-3 text-slate-500 dark:text-slate-400">{u.city ?? "—"}</td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="secondary" onClick={() => setEditingUser(u)}>
                        Edit
                      </Button>
                      <Button
                        variant="danger"
                        onClick={() => window.confirm(`Delete ${u.name}?`) && remove.mutate(u.id)}
                        disabled={remove.isPending}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {showForm && <NewUserModal role={role} onClose={() => setShowForm(false)} onCreated={invalidate} />}
      {editingUser && <EditUserModal user={editingUser} onClose={() => setEditingUser(null)} onSaved={invalidate} />}
    </div>
  );
}

function EditUserModal({ user, onClose, onSaved }: { user: ManagedUser; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: user.name,
    contactNo: user.contactNo ?? "",
    address: user.address ?? "",
    city: user.city ?? "",
    pincode: user.pincode ?? "",
    newPassword: "",
  });

  const save = useMutation({
    mutationFn: () =>
      api.put(`/admin/users/${user.id}`, {
        name: form.name,
        contactNo: form.contactNo,
        address: form.address,
        city: form.city,
        pincode: form.pincode,
        ...(form.newPassword ? { newPassword: form.newPassword } : {}),
      }),
    onSuccess: () => {
      onSaved();
      onClose();
      toast.success("Account updated");
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not update this account"),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <Card className="w-full max-w-sm">
        <h2 className="mb-1 text-lg font-semibold text-slate-900 dark:text-white">Edit {user.name}</h2>
        <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">{user.email} (email can't be changed here)</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
          className="flex flex-col gap-4"
        >
          <input
            required
            placeholder="Full name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
          <div className="grid grid-cols-2 gap-4">
            <input
              placeholder="Contact no."
              value={form.contactNo}
              onChange={(e) => setForm({ ...form, contactNo: e.target.value })}
              className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
            <input
              placeholder="City"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>
          <input
            placeholder="Address"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
          <input
            placeholder="Pincode"
            value={form.pincode}
            onChange={(e) => setForm({ ...form, pincode: e.target.value })}
            className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
          <input
            type="password"
            minLength={6}
            placeholder="New password (leave blank to keep current)"
            value={form.newPassword}
            onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
            className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={save.isPending}>
              Save changes
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

function NewUserModal({ role, onClose, onCreated }: { role: Role; onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ name: "", email: "", password: "", contactNo: "", city: "" });

  const create = useMutation({
    mutationFn: () => api.post("/admin/users", { ...form, role }),
    onSuccess: () => {
      onCreated();
      onClose();
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not create account"),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <Card className="w-full max-w-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">
          New {role === "STUDENT" ? "student" : "test conductor"}
        </h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate();
          }}
          className="flex flex-col gap-4"
        >
          <input
            required
            placeholder="Full name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
          <input
            required
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
          <input
            required
            type="password"
            minLength={6}
            placeholder="Password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
          <div className="grid grid-cols-2 gap-4">
            <input
              placeholder="Contact no."
              value={form.contactNo}
              onChange={(e) => setForm({ ...form, contactNo: e.target.value })}
              className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
            <input
              placeholder="City"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={create.isPending}>
              Create
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
