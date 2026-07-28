import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { asyncHandler, HttpError } from "../../lib/asyncHandler";
import { authMiddleware } from "../../middleware/auth";

const router = Router();
router.use(authMiddleware);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const attempts = await prisma.attempt.findMany({
      where: { studentId: req.user!.userId, status: { in: ["SUBMITTED", "EXPIRED"] } },
      include: { test: { include: { subject: true } } },
      orderBy: { endTime: "desc" },
    });

    const results = await Promise.all(
      attempts.map(async (a) => {
        const totalMarks = await prisma.question.aggregate({
          where: { testId: a.testId },
          _sum: { marks: true },
        });
        return {
          attemptId: a.id,
          testName: a.test.name,
          subjectName: a.test.subject.name,
          status: a.status,
          startTime: a.startTime,
          endTime: a.endTime,
          score: a.score ?? 0,
          totalMarks: totalMarks._sum.marks ?? 0,
        };
      })
    );
    res.json(results);
  })
);

router.get(
  "/:attemptId",
  asyncHandler(async (req, res) => {
    const attemptId = z.coerce.number().int().parse(req.params.attemptId);
    const attempt = await prisma.attempt.findUnique({
      where: { id: attemptId },
      include: { test: { include: { subject: true } } },
    });
    if (!attempt) throw new HttpError(404, "Result not found");

    const isOwner = attempt.studentId === req.user!.userId;
    const isReviewer = req.user!.role === "ADMIN" || req.user!.role === "STUDY_CENTER";
    if (!isOwner && !isReviewer) throw new HttpError(403, "Forbidden");

    if (attempt.status === "IN_PROGRESS") {
      throw new HttpError(409, "This attempt has not finished yet");
    }

    const answers = await prisma.answer.findMany({
      where: { attemptId },
      include: {
        question: { include: { options: { orderBy: { order: "asc" } } } },
        selectedOption: true,
      },
      orderBy: { question: { order: "asc" } },
    });

    const totalMarks = answers.reduce((sum, a) => sum + a.question.marks, 0);

    res.json({
      attemptId: attempt.id,
      testName: attempt.test.name,
      subjectName: attempt.test.subject.name,
      status: attempt.status,
      score: attempt.score ?? 0,
      totalMarks,
      questions: answers.map((a) => ({
        questionId: a.questionId,
        text: a.question.text,
        marks: a.question.marks,
        options: a.question.options.map((o) => ({ id: o.id, text: o.text, isCorrect: o.isCorrect })),
        selectedOptionId: a.selectedOptionId,
        state: a.state,
        awarded: a.selectedOption?.isCorrect ? a.question.marks : 0,
      })),
    });
  })
);

export default router;
