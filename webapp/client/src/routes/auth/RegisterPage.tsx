import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, useAnimationControls } from "motion/react";
import { useRegister } from "../../lib/useAuth";
import { notify } from "../../lib/toast";
import { ApiError } from "../../lib/apiClient";
import { AuthLayout } from "../../components/layout/AuthLayout";
import { Button } from "../../components/ui/Button";
import { Field, Input } from "../../components/ui/Field";

export function RegisterPage() {
  const [form, setForm] = useState({ name: "", email: "", password: "", contactNo: "", city: "" });
  const [showPassword, setShowPassword] = useState(false);
  const register = useRegister();
  const navigate = useNavigate();
  const shake = useAnimationControls();

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      const user = await register.mutateAsync(form);
      notify.success(`Welcome, ${user.name} — your account is ready.`);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      shake.start({ x: [0, -6, 5, -3, 0], transition: { duration: 0.4 } });
      notify.error(err instanceof ApiError ? err.message : "Registration failed");
    }
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Student registration. Administrators and test conductors are created by an admin."
      footer={
        <>
          Already registered?{" "}
          <Link to="/login" className="font-semibold text-fg-brand hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <motion.form animate={shake} onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="Full name" required>
          {(id) => (
            <Input id={id} required autoComplete="name" value={form.name} onChange={(e) => update("name", e.target.value)} />
          )}
        </Field>

        <Field label="Email" required>
          {(id) => (
            <Input
              id={id}
              type="email"
              autoComplete="email"
              required
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              placeholder="you@example.com"
            />
          )}
        </Field>

        <Field label="Password" hint="At least 8 characters." required>
          {(id) => (
            <div className="relative">
              <Input
                id={id}
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                minLength={8}
                value={form.password}
                onChange={(e) => update("password", e.target.value)}
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

        <div className="grid grid-cols-2 gap-4">
          <Field label="Contact no.">
            {(id) => <Input id={id} value={form.contactNo} onChange={(e) => update("contactNo", e.target.value)} />}
          </Field>
          <Field label="City">
            {(id) => <Input id={id} value={form.city} onChange={(e) => update("city", e.target.value)} />}
          </Field>
        </div>

        <Button type="submit" size="lg" loading={register.isPending} className="mt-2 w-full">
          Create account
        </Button>
      </motion.form>
    </AuthLayout>
  );
}
