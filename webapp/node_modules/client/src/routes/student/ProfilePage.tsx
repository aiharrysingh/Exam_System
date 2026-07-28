import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "motion/react";
import { api, ApiError } from "../../lib/apiClient";
import { notify } from "../../lib/toast";
import { staggerContainer, fadeInUp } from "../../lib/motion";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Field, Input } from "../../components/ui/Field";
import { Skeleton } from "../../components/ui/Skeleton";

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
      notify.success("Profile updated");
    },
    onError: (err) => notify.error(err instanceof ApiError ? err.message : "Update failed"),
  });

  if (isLoading || !data) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-7 w-40" />
        <Card className="max-w-xl">
          <div className="flex flex-col gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i}>
                <Skeleton className="mb-2 h-3 w-24" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  const set = <K extends keyof typeof form>(key: K, value: string) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <motion.div variants={staggerContainer(2)} initial="hidden" animate="show" className="flex flex-col gap-6">
      <motion.div variants={fadeInUp}>
        <h1 className="text-2xl font-bold tracking-tight text-fg">Profile</h1>
        <p className="text-sm text-fg-muted">Update your details or change your password.</p>
      </motion.div>

      <motion.div variants={fadeInUp}>
        <Card className="max-w-xl">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              update.mutate();
            }}
            className="flex flex-col gap-4"
          >
            <Field label="Email" hint="Your email can't be changed here — contact an administrator.">
              {(id) => <Input id={id} disabled value={data.email} />}
            </Field>

            <Field label="Full name" required>
              {(id) => <Input id={id} required value={form.name} onChange={(e) => set("name", e.target.value)} />}
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Contact no.">
                {(id) => <Input id={id} value={form.contactNo} onChange={(e) => set("contactNo", e.target.value)} />}
              </Field>
              <Field label="City">
                {(id) => <Input id={id} value={form.city} onChange={(e) => set("city", e.target.value)} />}
              </Field>
            </div>

            <Field label="Address">
              {(id) => <Input id={id} value={form.address} onChange={(e) => set("address", e.target.value)} />}
            </Field>

            <Field label="Pincode">
              {(id) => <Input id={id} value={form.pincode} onChange={(e) => set("pincode", e.target.value)} />}
            </Field>

            <div className="mt-2 border-t border-border-subtle pt-5">
              <Field label="New password" hint="Leave blank to keep your current password. Minimum 6 characters.">
                {(id) => (
                  <Input
                    id={id}
                    type="password"
                    autoComplete="new-password"
                    value={form.newPassword}
                    onChange={(e) => set("newPassword", e.target.value)}
                  />
                )}
              </Field>
            </div>

            <Button type="submit" loading={update.isPending} className="mt-2 self-start">
              Save changes
            </Button>
          </form>
        </Card>
      </motion.div>
    </motion.div>
  );
}
