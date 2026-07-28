import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { asyncHandler, HttpError } from "../../lib/asyncHandler";
import { authMiddleware, requireRole } from "../../middleware/auth";
import { assertOwnerOrAdmin, ownerFilter } from "../../lib/ownership";
import { recomputeScore } from "../attempts/service";

const router = Router();
router.use(authMiddleware, requireRole("ADMIN", "STUDY_CENTER"));

router.get(
  "/queue",
  asyncHandler(async (req, res) => {
    const attempts = await prisma.attempt.findMany({
      where: { gradingStatus: "PENDING_REVIEW", test: ownerFilter(req) },
      include: { student: { select: { id: true, name: true } }, test: { select: { id: true, name: true } } },
      orderBy: { endTime: "asc" },
    });
    res.json(
      attempts.map((a) => ({
        attemptId: a.id,
        studentName: a.student.name,
        testId: a.test.id,
        testName: a.test.name,
        status: a.status,
        endTime: a.endTime,
      }))
    );
  })
);

router.get(
  "/attempts/:attemptId",
  asyncHandler(async (req, res) => {
    const attemptId = z.coerce.number().int().parse(req.params.attemptId);
    const attempt = await prisma.attempt.findUnique({
      where: { id: attemptId },
      include: { student: { select: { name: true } }, test: { select: { id: true, name: true, ownerId: true } } },
    });
    if (!attempt) throw new HttpError(404, "Attempt not found");
    assertOwnerOrAdmin(req, attempt.test);

    const answers = await prisma.answer.findMany({
      where: { attemptId, question: { type: "SHORT_ANSWER" } },
      include: { question: { select: { id: true, text: true, marks: true } } },
      orderBy: { order: "asc" },
    });

    res.json({
      attemptId: attempt.id,
      studentName: attempt.student.name,
      testName: attempt.test.name,
      answers: answers.map((a) => ({
        answerId: a.id,
        questionId: a.questionId,
        text: a.question.text,
        maxMarks: a.question.marks,
        textResponse: a.textResponse,
        awardedMarks: a.awardedMarks,
      })),
    });
  })
);

const gradeSchema = z.object({ awardedMarks: z.coerce.number().min(0) });

router.put(
  "/answers/:answerId",
  asyncHandler(async (req, res) => {
    const answerId = z.coerce.number().int().parse(req.params.answerId);
    const body = gradeSchema.parse(req.body);

    const answer = await prisma.answer.findUnique({
      where: { id: answerId },
      include: { question: { select: { marks: true, type: true } }, attempt: { include: { test: true } } },
    });
    if (!answer) throw new HttpError(404, "Answer not found");
    if (answer.question.type !== "SHORT_ANSWER") {
      throw new HttpError(400, "Only short-answer questions can be manually graded");
    }
    assertOwnerOrAdmin(req, answer.attempt.test);
    if (body.awardedMarks > answer.question.marks) {
      throw new HttpError(400, `Awarded marks cannot exceed the question's ${answer.question.marks} marks`);
    }

    await prisma.answer.update({
      where: { id: answerId },
      data: { awardedMarks: body.awardedMarks, gradedById: req.user!.userId, gradedAt: new Date() },
    });
    const attempt = await recomputeScore(answer.attemptId);
    res.json({ attemptId: attempt.id, score: attempt.score, gradingStatus: attempt.gradingStatus });
  })
);

export default router;
