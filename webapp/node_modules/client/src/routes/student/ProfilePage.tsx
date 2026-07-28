import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api, ApiError } from "../../lib/apiClient";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { FullPageSpinner } from "../../components/ui/Spinner";

interface Profile {
  id: number;
  name: string;
  email: string;
  contactNo: string | null;
  address: string | null;
  city: string | null;
  pincode: string | null;
}

export function ProfilePage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["students", "me"], queryFn: () => api.get<Profile>("/students/me") });
  const [form, setForm] = useState({ name: "", contactNo: "", address: "", city: "", pincode: "", newPassword: "" });

  useEffect(() => {
    if (data) {
      setForm({
        name: data.name,
        contactNo: data.contactNo ?? "",
        address: data.address ?? "",
        city: data.city ?? "",
        pincode: data.pincode ?? "",
        newPassword: "",
      });
    }
  }, [data]);

  const update = useMutation({
    mutationFn: () =>
      api.put<Profile>("/students/me", {
        name: form.name,
        contactNo: form.contactNo,
        address: form.address,
        city: form.city,
        pincode: form.pincode,
        ...(form.newPassword ? { newPassword: form.newPassword } : {}),
      }),
    onSuccess: (profile) => {
      qc.setQueryData(["students", "me"], profile);
      setForm((f) => ({ ...f, newPassword: "" }));
      toast.success("Profile updated");
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Update failed"),
  });

  if (isLoading || !data) return <FullPageSpinner />;

  function field<K extends keyof typeof form>(key: K, label: string, type = "text") {
    return (
      <label className="flex flex-col gap-1 text-sm font-medium text-slate-700 dark:text-slate-200">
        {label}
        <input
          type={type}
          value={form[key]}
          onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
          className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        />
      </label>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Profile</h1>
      <Card className="max-w-xl">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            update.mutate();
          }}
          className="flex flex-col gap-4"
        >
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700 dark:text-slate-200">
            Email (read-only)
            <input
              disabled
              value={data.email}
              className="rounded-xl border border-slate-200 bg-slate-100 px-3 py-2.5 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-400"
            />
          </label>
          {field("name", "Full name")}
          <div className="grid grid-cols-2 gap-4">
            {field("contactNo", "Contact no.")}
            {field("city", "City")}
          </div>
          {field("address", "Address")}
          {field("pincode", "Pincode")}
          {field("newPassword", "New password (leave blank to keep current)", "password")}
          <Button type="submit" disabled={update.isPending} className="mt-2 self-start">
            {update.isPending ? "Saving..." : "Save changes"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
