import nodemailer, { Transporter } from "nodemailer";

let transporter: Transporter | null = null;
let attemptedInit = false;

function getTransporter(): Transporter | null {
  if (attemptedInit) return transporter;
  attemptedInit = true;
  if (!process.env.SMTP_HOST) {
    console.log("[mailer] SMTP_HOST not set — email sending is disabled for this environment.");
    return null;
  }
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587,
    secure: process.env.SMTP_SECURE === "true",
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
  return transporter;
}

/**
 * Fire-and-forget: never throws. If SMTP isn't configured (the default in
 * this dev environment), this logs and resolves instead of failing the
 * request that triggered it.
 */
export async function sendMail(to: string, subject: string, text: string): Promise<void> {
  const t = getTransporter();
  if (!t) {
    console.log(`[mailer] (no-op) would send to ${to}: "${subject}"`);
    return;
  }
  try {
    await t.sendMail({ from: process.env.SMTP_FROM || "ExamHub <noreply@examhub.local>", to, subject, text });
  } catch (err) {
    console.error("[mailer] send failed:", err);
  }
}
