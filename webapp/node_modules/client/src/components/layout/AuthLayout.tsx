import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { duration, ease } from "../../lib/motion";
import { Logo, LogoMark } from "../brand/Logo";

const PROOF_POINTS = [
  { icon: "◈", title: "Server-timed exams", body: "Deadlines are enforced server-side — never by the browser clock." },
  { icon: "◆", title: "Reusable question banks", body: "Author once, share across tests, import in bulk from CSV." },
  { icon: "◲", title: "Item-level analytics", body: "See which questions are too hard, and where students lose time." },
];

/** Blurred colour blobs. Decorative only — static under reduced motion. */
function Mesh() {
  const reduce = useReducedMotion();
  const blobs = [
    { className: "left-[-10%] top-[-5%] h-[26rem] w-[26rem] bg-brand-500/20", dur: 22, dx: 40, dy: 30 },
    { className: "right-[-8%] top-[30%] h-[22rem] w-[22rem] bg-accent-500/16", dur: 26, dx: -34, dy: 44 },
    { className: "bottom-[-12%] left-[25%] h-[24rem] w-[24rem] bg-brand-800/40", dur: 18, dx: 28, dy: -30 },
  ];
  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden">
      {blobs.map((b, i) => (
        <motion.div
          key={i}
          className={`absolute rounded-full blur-3xl ${b.className}`}
          animate={
            reduce ? undefined : { x: [0, b.dx, 0], y: [0, b.dy, 0], scale: [1, 1.08, 1] }
          }
          transition={{ duration: b.dur, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }}
        />
      ))}
      {/* faint grid */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
      />
    </div>
  );
}

export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden bg-surface-inverse lg:block">
        <Mesh />
        <div className="relative flex h-full flex-col justify-between p-12">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: duration.slow, ease: ease.out }}
            className="flex items-center gap-2.5"
          >
            <LogoMark />
            <span className="text-lg font-bold tracking-tight text-white">ExamHub</span>
          </motion.div>

          <div>
            <motion.h2
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: duration.slower, ease: ease.out, delay: 0.08 }}
              className="max-w-md text-3xl font-bold leading-tight tracking-tight text-white"
            >
              Examinations that hold up under scrutiny.
            </motion.h2>
            <ul className="mt-8 flex max-w-md flex-col gap-5">
              {PROOF_POINTS.map((p, i) => (
                <motion.li
                  key={p.title}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: duration.slow, ease: ease.out, delay: 0.18 + i * 0.09 }}
                  className="flex gap-3.5"
                >
                  <span
                    aria-hidden="true"
                    className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/10 text-sm text-white ring-1 ring-inset ring-white/15"
                  >
                    {p.icon}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-white">{p.title}</p>
                    <p className="mt-0.5 text-sm leading-relaxed text-white/60">{p.body}</p>
                  </div>
                </motion.li>
              ))}
            </ul>
          </div>

          <p className="text-2xs text-white/40">© {new Date().getFullYear()} ExamHub</p>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center bg-canvas p-6 sm:p-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: ease.out }}
          className="w-full max-w-sm"
        >
          <div className="mb-7 lg:hidden">
            <Logo />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-fg">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-fg-muted">{subtitle}</p>}
          <div className="mt-7">{children}</div>
          {footer && <div className="mt-6 text-center text-sm text-fg-muted">{footer}</div>}
        </motion.div>
      </div>
    </div>
  );
}
