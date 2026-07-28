import { Attempt, AttemptStatus } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { HttpError } from "../../lib/asyncHandler";

/**
 * Computes score from currently-saved answers and closes out the attempt.
 * Called both for a real "submit" and for a server-detected timeout — the
 * only difference is the resulting status (SUBMITTED vs EXPIRED) and the
 * endTime used (now vs the original deadline, so an expired attempt's
 * recorded duration never exceeds what was actually allotted).
 */
async function finalizeAttempt(attemptId: number, status: "SUBMITTED" | "EXPIRED"): Promise<Attempt> {
  return prisma.$transaction(async (tx) => {
    const attempt = await tx.attempt.findUniqueOrThrow({ where: { id: attemptId } });
    if (attempt.status !== "IN_PROGRESS") return attempt;

    const answers = await tx.answer.findMany({
      where: { attemptId },
      include: { question: true, selectedOption: true },
    });
    const score = answers.reduce(
      (sum, a) => sum + (a.selectedOption?.isCorrect ? a.question.marks : 0),
      0
    );

    return tx.attempt.update({
      where: { id: attemptId },
      data: {
        status,
        score,
        endTime: status === "EXPIRED" ? attempt.deadline : new Date(),
      },
    });
  });
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
