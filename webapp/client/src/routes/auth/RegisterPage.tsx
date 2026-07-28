import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useRegister } from "../../lib/useAuth";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { ApiError } from "../../lib/apiClient";

export function RegisterPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    contactNo: "",
    city: "",
  });
  const register = useRegister();
  const navigate = useNavigate();

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      const user = await register.mutateAsync(form);
      toast.success(`Welcome, ${user.name}! Your account is ready.`);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Registration failed");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 via-white to-accent-50 p-4 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      <Card className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Create your student account</h1>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700 dark:text-slate-200">
            Full name
            <input
              required
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700 dark:text-slate-200">
            Email
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700 dark:text-slate-200">
            Password
            <input
              type="password"
              required
              minLength={6}
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700 dark:text-slate-200">
              Contact no.
              <input
                value={form.contactNo}
                onChange={(e) => update("contactNo", e.target.value)}
                className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700 dark:text-slate-200">
              City
              <input
                value={form.city}
                onChange={(e) => update("city", e.target.value)}
                className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </label>
          </div>
          <Button type="submit" disabled={register.isPending} className="mt-2 w-full">
            {register.isPending ? "Creating account..." : "Create account"}
          </Button>
        </form>
        <p className="mt-5 text-center text-sm text-slate-500 dark:text-slate-400">
          Already registered?{" "}
          <Link to="/login" className="font-semibold text-brand-600 dark:text-brand-400">
            Sign in
          </Link>
        </p>
      </Card>
    </div>
  );
}
