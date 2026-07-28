import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, useAnimationControls } from "motion/react";
import { useLogin } from "../../lib/useAuth";
import { notify } from "../../lib/toast";
import { ApiError } from "../../lib/apiClient";
import { AuthLayout } from "../../components/layout/AuthLayout";
import { Button } from "../../components/ui/Button";
import { Field, Input } from "../../components/ui/Field";
import { roleHome } from "../roleHome";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const login = useLogin();
  const navigate = useNavigate();
  const shake = useAnimationControls();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      const user = await login.mutateAsync({ email, password });
      notify.success(`Welcome back, ${user.name}`);
      navigate(roleHome(user.role), { replace: true });
    } catch (err) {
      shake.start({ x: [0, -6, 5, -3, 0], transition: { duration: 0.4 } });
      notify.error(err instanceof ApiError ? err.message : "Login failed");
    }
  }

  return (
    <AuthLayout
      title="Sign in"
      subtitle="Students, administrators, and test conductors all sign in here."
      footer={
        <>
          New student?{" "}
          <Link to="/register" className="font-semibold text-fg-brand hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <motion.form animate={shake} onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="Email" required>
          {(id) => (
            <Input
              id={id}
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          )}
        </Field>

        <Field label="Password" required>
          {(id) => (
            <div className="relative">
              <Input
                id={id}
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pr-11"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute inset-y-0 right-0 grid w-11 place-items-center text-fg-muted transition-colors hover:text-fg"
              >
                {showPassword ? "🙈" : "👁"}
              </button>
            </div>
          )}
        </Field>

        <Button type="submit" size="lg" loading={login.isPending} className="mt-2 w-full">
          Sign in
        </Button>
      </motion.form>
    </AuthLayout>
  );
}
