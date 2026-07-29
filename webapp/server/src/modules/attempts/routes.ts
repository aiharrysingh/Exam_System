import { Router } from "express";
import { z } from "zod";
import rateLimit from "express-rate-limit";
import { prisma } from "../../lib/prisma";
import { asyncHandler, HttpError } from "../../lib/asyncHandler";
import { authMiddleware, requireRole } from "../../middleware/auth";
import { ensureActiveOrFinalize, loadOwnedAttempt, submitAttempt } from "./service";

const studentOnly = [authMiddleware, requireRole("STUDENT")];

/**
 * Test `code` is a shared secret with no length/format floor (seed data has
 * codes as short as "123") — without this, an authenticated student could
 * script repeated guesses against a testId until one lands. Keyed by IP+user
 * rather than IP alone so one bad actor on a shared school network can't
 * lock out everyone else on it.
 */
const startAttemptLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `${req.ip}:${req.user?.userId ?? "anon"}`,
  message: { error: "Too many attempts to start this test. Please wait a while and try again." },
});

const MAX_TIME_PER_SAVE_SEC = 1800; // clamp: this is analytics instrumentation, not exam-integrity-grade

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Mounted at /api/tests — the one attempt-related route that hangs off a test id. */
export const testStartRouter = Router();

const startSchema = z.object({ code: z.string().min(1) });

testStartRouter.post(
  "/:id/start",
  ...studentOnly,
  startAttemptLimiter,
  asyncHandler(async (req, res) => {
    const testId = z.coerce.number().int().parse(req.params.id);
    const { code } = startSchema.parse(req.body);
    const studentId = req.user!.userId;

    const test = await prisma.test.findUnique({
      where: { id: testId },
      include: { testQuestions: { orderBy: { order: "asc" } } },
    });
    if (!test || !test.isPublished) throw new HttpError(404, "Test not found");

    const now = new Date();
    if (now < test.availableFrom || now > test.availableTo) {
      throw new HttpError(400, "This test is not currently available");
    }
    if (test.code !== code) {
      throw new HttpError(400, "Incorrect test code");
    }
    if (test.testQuestions.length === 0) {
      throw new HttpError(400, "This test has no questions yet");
    }

    const existing = await prisma.attempt.findUnique({
      where: { studentId_testId: { studentId, testId } },
    });
    if (existing) {
      if (existing.status === "IN_PROGRESS") {
        return res.status(409).json({ error: "Already in progress", attemptId: existing.id });
      }
      throw new HttpError(409, "You have already attempted this test");
    }

    // Pooling implies picking a random subset (which also randomizes order); otherwise
    // shuffleQuestions alone just reorders the full attached set.
    let selected = test.testQuestions;
    if (test.poolSize && test.poolSize < selected.length) {
      selected = shuffle(selected).slice(0, test.poolSize);
    } else if (test.shuffleQuestions) {
      selected = shuffle(selected);
    }

    const deadline = new Date(now.getTime() + test.durationMin * 60_000);
    const attempt = await prisma.$transaction(async (tx) => {
      const created = await tx.attempt.create({ data: { studentId, testId, deadline } });
      await tx.answer.createMany({
        data: selected.map((tq, i) => ({ attemptId: created.id, questionId: tq.questionId, order: i + 1 })),
      });
      return created;
    });

    res.status(201).json({ attemptId: attempt.id, deadline: attempt.deadline, serverNow: now });
  })
);

/** Mounted at /api/attempts */
const router = Router();
router.use(...studentOnly);

router.get(
  "/in-progress",
  asyncHandler(async (req, res) => {
    const attempts = await prisma.attempt.findMany({
      where: { studentId: req.user!.userId, status: "IN_PROGRESS" },
      include: { test: { include: { subject: true } } },
    });

    const stillActive = [];
    for (const a of attempts) {
      const refreshed = await ensureActiveOrFinalize(a.id);
      if (refreshed.status === "IN_PROGRESS") {
        stillActive.push({
          attemptId: refreshed.id,
          testId: a.testId,
          testName: a.test.name,
          subjectName: a.test.subject.name,
          startTime: refreshed.startTime,
          deadline: refreshed.deadline,
        });
      }
    }
    res.json(stillActive);
  })
);

router.get(
  "/:id/resume",
  asyncHandler(async (req, res) => {
    const attemptId = z.coerce.number().int().parse(req.params.id);
    const owned = await loadOwnedAttempt(attemptId, req.user!.userId);
    const attempt = await ensureActiveOrFinalize(owned.id);
    if (attempt.status !== "IN_PROGRESS") {
      return res.status(409).json({ error: "Attempt is no longer in progress", status: attempt.status });
    }
    const test = await prisma.test.findUniqueOrThrow({ where: { id: attempt.testId } });
    const answers = await prisma.answer.findMany({
      where: { attemptId },
      orderBy: { order: "asc" },
    });
    const firstUnanswered = answers.find((a) => a.state === "UNANSWERED");

    res.json({
      attemptId: attempt.id,
      testId: attempt.testId,
      testName: test.name,
      durationMin: test.durationMin,
      deadline: attempt.deadline,
      serverNow: new Date(),
      totalQuestions: answers.length,
      resumeAtOrder: firstUnanswered?.order ?? answers[0]?.order ?? 1,
    });
  })
);

router.get(
  "/:id/questions/:order",
  asyncHandler(async (req, res) => {
    const attemptId = z.coerce.number().int().parse(req.params.id);
    const order = z.coerce.number().int().positive().parse(req.params.order);
    const owned = await loadOwnedAttempt(attemptId, req.user!.userId);
    const attempt = await ensureActiveOrFinalize(owned.id);
    if (attempt.status !== "IN_PROGRESS") {
      return res.status(409).json({ error: "Attempt is no longer in progress", status: attempt.status });
    }

    const answer = await prisma.answer.findFirst({
      where: { attemptId, order },
      include: {
        question: { include: { options: { orderBy: { order: "asc" }, select: { id: true, text: true, order: true } } } },
        selections: true,
      },
    });
    if (!answer) throw new HttpError(404, "Question not found");

    const totalQuestions = await prisma.answer.count({ where: { attemptId } });

    res.json({
      order,
      totalQuestions,
      questionId: answer.question.id,
      type: answer.question.type,
      text: answer.question.text,
      marks: answer.question.marks,
      options: answer.question.options,
      selectedOptionIds: answer.selections.map((s) => s.optionId),
      textResponse: answer.textResponse,
      state: answer.state,
      deadline: attempt.deadline,
      serverNow: new Date(),
    });
  })
);

const answerSchema = z.object({
  selectedOptionIds: z.array(z.number().int()).optional(),
  textResponse: z.string().optional(),
  state: z.enum(["UNANSWERED", "ANSWERED", "MARKED_FOR_REVIEW"]),
  timeSpentMs: z.number().int().min(0).optional(),
});

router.put(
  "/:id/answers/:questionId",
  asyncHandler(async (req, res) => {
    const attemptId = z.coerce.number().int().parse(req.params.id);
    const questionId = z.coerce.number().int().parse(req.params.questionId);
    const body = answerSchema.parse(req.body);
    const owned = await loadOwnedAttempt(attemptId, req.user!.userId);
    const attempt = await ensureActiveOrFinalize(owned.id);
    if (attempt.status !== "IN_PROGRESS") {
      return res.status(409).json({ error: "Attempt is no longer in progress", status: attempt.status });
    }

    const question = await prisma.question.findUniqueOrThrow({ where: { id: questionId } });
    const selectedOptionIds = body.selectedOptionIds ?? [];
    if (
      (question.type === "SINGLE_CHOICE" || question.type === "TRUE_FALSE") &&
      selectedOptionIds.length > 1
    ) {
      throw new HttpError(400, "This question allows only one selected option");
    }
    if (question.type === "SHORT_ANSWER" && selectedOptionIds.length > 0) {
      throw new HttpError(400, "This question does not take selected options");
    }

    const addedSec = body.timeSpentMs
      ? Math.min(MAX_TIME_PER_SAVE_SEC, Math.round(body.timeSpentMs / 1000))
      : 0;

    const answer = await prisma.$transaction(async (tx) => {
      const current = await tx.answer.findUniqueOrThrow({ where: { attemptId_questionId: { attemptId, questionId } } });
      await tx.answerOption.deleteMany({ where: { answerId: current.id } });
      if (selectedOptionIds.length > 0) {
        await tx.answerOption.createMany({
          data: selectedOptionIds.map((optionId) => ({ answerId: current.id, optionId })),
        });
      }
      return tx.answer.update({
        where: { id: current.id },
        data: {
          textResponse: question.type === "SHORT_ANSWER" ? body.textResponse ?? null : null,
          state: body.state,
          timeSpentSec: { increment: addedSec },
        },
        include: { selections: true },
      });
    });

    res.json({
      questionId: answer.questionId,
      selectedOptionIds: answer.selections.map((s) => s.optionId),
      textResponse: answer.textResponse,
      state: answer.state,
    });
  })
);

router.get(
  "/:id/summary",
  asyncHandler(async (req, res) => {
    const attemptId = z.coerce.number().int().parse(req.params.id);
    const owned = await loadOwnedAttempt(attemptId, req.user!.userId);
    const attempt = await ensureActiveOrFinalize(owned.id);

    const answers = await prisma.answer.findMany({
      where: { attemptId },
      orderBy: { order: "asc" },
    });

    res.json({
      status: attempt.status,
      deadline: attempt.deadline,
      serverNow: new Date(),
      questions: answers.map((a) => ({
        order: a.order,
        questionId: a.questionId,
        state: a.state,
      })),
    });
  })
);

router.post(
  "/:id/submit",
  asyncHandler(async (req, res) => {
    const attemptId = z.coerce.number().int().parse(req.params.id);
    await loadOwnedAttempt(attemptId, req.user!.userId);
    const finalized = await submitAttempt(attemptId);
    const answers = await prisma.answer.findMany({
      where: { attemptId },
      include: { question: { select: { marks: true } } },
    });
    const totalMarks = answers.reduce((sum, a) => sum + a.question.marks, 0);
    res.json({
      status: finalized.status,
      score: finalized.score,
      gradingStatus: finalized.gradingStatus,
      totalMarks,
    });
  })
);

export default router;
