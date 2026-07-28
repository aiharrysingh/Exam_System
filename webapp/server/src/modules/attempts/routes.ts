import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { asyncHandler, HttpError } from "../../lib/asyncHandler";
import { authMiddleware, requireRole } from "../../middleware/auth";
import { ensureActiveOrFinalize, loadOwnedAttempt, submitAttempt } from "./service";

const studentOnly = [authMiddleware, requireRole("STUDENT")];

/** Mounted at /api/tests — the one attempt-related route that hangs off a test id. */
export const testStartRouter = Router();

const startSchema = z.object({ code: z.string().min(1) });

testStartRouter.post(
  "/:id/start",
  ...studentOnly,
  asyncHandler(async (req, res) => {
    const testId = z.coerce.number().int().parse(req.params.id);
    const { code } = startSchema.parse(req.body);
    const studentId = req.user!.userId;

    const test = await prisma.test.findUnique({ where: { id: testId }, include: { questions: true } });
    if (!test || !test.isPublished) throw new HttpError(404, "Test not found");

    const now = new Date();
    if (now < test.availableFrom || now > test.availableTo) {
      throw new HttpError(400, "This test is not currently available");
    }
    if (test.code !== code) {
      throw new HttpError(400, "Incorrect test code");
    }
    if (test.questions.length === 0) {
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

    const deadline = new Date(now.getTime() + test.durationMin * 60_000);
    const attempt = await prisma.$transaction(async (tx) => {
      const created = await tx.attempt.create({
        data: { studentId, testId, deadline },
      });
      await tx.answer.createMany({
        data: test.questions.map((q) => ({ attemptId: created.id, questionId: q.id })),
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
      include: { question: true },
      orderBy: { question: { order: "asc" } },
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
      resumeAtOrder: firstUnanswered?.question.order ?? answers[0]?.question.order ?? 1,
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

    const question = await prisma.question.findFirst({
      where: { testId: attempt.testId, order },
      include: { options: { orderBy: { order: "asc" }, select: { id: true, text: true, order: true } } },
    });
    if (!question) throw new HttpError(404, "Question not found");

    const totalQuestions = await prisma.question.count({ where: { testId: attempt.testId } });
    const answer = await prisma.answer.findUnique({
      where: { attemptId_questionId: { attemptId, questionId: question.id } },
    });

    res.json({
      order,
      totalQuestions,
      questionId: question.id,
      text: question.text,
      marks: question.marks,
      options: question.options,
      selectedOptionId: answer?.selectedOptionId ?? null,
      state: answer?.state ?? "UNANSWERED",
      deadline: attempt.deadline,
      serverNow: new Date(),
    });
  })
);

const answerSchema = z.object({
  selectedOptionId: z.number().int().nullable().optional(),
  state: z.enum(["UNANSWERED", "ANSWERED", "MARKED_FOR_REVIEW"]),
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

    const answer = await prisma.answer.update({
      where: { attemptId_questionId: { attemptId, questionId } },
      data: { selectedOptionId: body.selectedOptionId ?? null, state: body.state },
    });
    res.json({ questionId: answer.questionId, selectedOptionId: answer.selectedOptionId, state: answer.state });
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
      include: { question: { select: { order: true } } },
      orderBy: { question: { order: "asc" } },
    });

    res.json({
      status: attempt.status,
      deadline: attempt.deadline,
      serverNow: new Date(),
      questions: answers.map((a) => ({
        order: a.question.order,
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
    const totalMarks = await prisma.question.aggregate({
      where: { testId: finalized.testId },
      _sum: { marks: true },
    });
    res.json({
      status: finalized.status,
      score: finalized.score,
      totalMarks: totalMarks._sum.marks ?? 0,
    });
  })
);

export default router;
