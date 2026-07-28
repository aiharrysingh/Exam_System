import { Attempt, AttemptStatus } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { HttpError } from "../../lib/asyncHandler";
import { sendMail } from "../../lib/mailer";
import { scoreAnswer } from "./scoring";

async function notifyResultReady(attemptId: number): Promise<void> {
  const attempt = await prisma.attempt.findUnique({
    where: { id: attemptId },
    include: { student: true, test: true },
  });
  if (!attempt) return;
  const pending = attempt.gradingStatus === "PENDING_REVIEW";
  await sendMail(
    attempt.student.email,
    `Your result for "${attempt.test.name}" is ready`,
    pending
      ? `You scored ${attempt.score} so far on "${attempt.test.name}". Some short-answer questions are still pending manual review, so your final score may change.`
      : `You scored ${attempt.score} on "${attempt.test.name}". Log in to ExamHub to see the full breakdown.`
  );
}

/**
 * Computes score from currently-saved answers and closes out the attempt.
 * Called both for a real "submit" and for a server-detected timeout — the
 * only difference is the resulting status (SUBMITTED vs EXPIRED) and the
 * endTime used (now vs the original deadline, so an expired attempt's
 * recorded duration never exceeds what was actually allotted).
 */
async function finalizeAttempt(attemptId: number, status: "SUBMITTED" | "EXPIRED"): Promise<Attempt> {
  const result = await prisma.$transaction(async (tx) => {
    const attempt = await tx.attempt.findUniqueOrThrow({ where: { id: attemptId } });
    if (attempt.status !== "IN_PROGRESS") return null;

    const answers = await tx.answer.findMany({
      where: { attemptId },
      include: { question: { include: { options: true } }, selections: true },
    });

    const scored = answers.map((answer) => ({ id: answer.id, awarded: scoreAnswer(answer.question, answer) }));
    for (const { id, awarded } of scored) {
      await tx.answer.update({ where: { id }, data: { awardedMarks: awarded } });
    }

    const total = scored.reduce((sum, s) => sum + (s.awarded ?? 0), 0);
    const gradingStatus = scored.some((s) => s.awarded === null) ? "PENDING_REVIEW" : "FULLY_GRADED";

    return tx.attempt.update({
      where: { id: attemptId },
      data: {
        status,
        score: Math.max(0, total),
        gradingStatus,
        endTime: status === "EXPIRED" ? attempt.deadline : new Date(),
      },
    });
  });

  if (result) {
    notifyResultReady(attemptId).catch((err) => console.error("[mailer] result-ready notification failed:", err));
    return result;
  }
  return prisma.attempt.findUniqueOrThrow({ where: { id: attemptId } });
}

/**
 * Re-sums an attempt's score from already-persisted `Answer.awardedMarks`
 * (never re-derives correctness) — called after a manual grade is entered
 * for a previously-pending SHORT_ANSWER answer.
 */
export async function recomputeScore(attemptId: number): Promise<Attempt> {
  const before = await prisma.attempt.findUniqueOrThrow({ where: { id: attemptId } });
  const updated = await prisma.$transaction(async (tx) => {
    const answers = await tx.answer.findMany({ where: { attemptId } });
    const total = answers.reduce((sum, a) => sum + (a.awardedMarks ?? 0), 0);
    const gradingStatus = answers.some((a) => a.awardedMarks === null) ? "PENDING_REVIEW" : "FULLY_GRADED";
    return tx.attempt.update({
      where: { id: attemptId },
      data: { score: Math.max(0, total), gradingStatus },
    });
  });
  if (before.gradingStatus === "PENDING_REVIEW" && updated.gradingStatus === "FULLY_GRADED") {
    notifyResultReady(attemptId).catch((err) => console.error("[mailer] final-result notification failed:", err));
  }
  return updated;
}

/**
 * The single choke point every attempt-touching endpoint must call first.
 * Server time, not the client's clock or the client's own countdown, is the
 * only thing that ever closes out an attempt for running out of time.
 */
export async function ensureActiveOrFinalize(attemptId: number): Promise<Attempt> {
  const attempt = await prisma.attempt.findUniqueOrThrow({ where: { id: attemptId } });
  if (attempt.status !== "IN_PROGRESS") return attempt;
  if (new Date() > attempt.deadline) {
    return finalizeAttempt(attemptId, "EXPIRED");
  }
  return attempt;
}

export async function submitAttempt(attemptId: number): Promise<Attempt> {
  const attempt = await ensureActiveOrFinalize(attemptId);
  if (attempt.status !== "IN_PROGRESS") return attempt;
  return finalizeAttempt(attemptId, "SUBMITTED");
}

export async function loadOwnedAttempt(attemptId: number, studentId: number): Promise<Attempt> {
  const attempt = await prisma.attempt.findUnique({ where: { id: attemptId } });
  if (!attempt) throw new HttpError(404, "Attempt not found");
  if (attempt.studentId !== studentId) throw new HttpError(403, "Forbidden");
  return attempt;
}

export function assertInProgress(attempt: Attempt): void {
  if (attempt.status !== ("IN_PROGRESS" satisfies AttemptStatus)) {
    throw new HttpError(409, "This attempt is no longer in progress");
  }
}

/** Sweep for abandoned attempts with no further requests coming in. */
export async function sweepExpiredAttempts(): Promise<number> {
  const overdue = await prisma.attempt.findMany({
    where: { status: "IN_PROGRESS", deadline: { lt: new Date() } },
    select: { id: true },
  });
  for (const { id } of overdue) {
    await finalizeAttempt(id, "EXPIRED");
  }
  return overdue.length;
}
