import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useLogin } from "../../lib/useAuth";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { ApiError } from "../../lib/apiClient";
import { roleHome } from "../roleHome";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const login = useLogin();
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      const user = await login.mutateAsync({ email, password });
      toast.success(`Welcome back, ${user.name}`);
      navigate(roleHome(user.role), { replace: true });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Login failed");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 via-white to-accent-50 p-4 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      <Card className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-600 to-accent-500 text-xl font-bold text-white">
            E
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Sign in to ExamHub</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Students, admins, and study centers all sign in here</p>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700 dark:text-slate-200">
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700 dark:text-slate-200">
            Password
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </label>
          <Button type="submit" disabled={login.isPending} className="mt-2 w-full">
            {login.isPending ? "Signing in..." : "Sign in"}
          </Button>
        </form>
        <p className="mt-5 text-center text-sm text-slate-500 dark:text-slate-400">
          New student?{" "}
          <Link to="/register" className="font-semibold text-brand-600 dark:text-brand-400">
            Create an account
          </Link>
        </p>
      </Card>
    </div>
  );
}
