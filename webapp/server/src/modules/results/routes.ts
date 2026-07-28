import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { asyncHandler, HttpError } from "../../lib/asyncHandler";
import { authMiddleware } from "../../middleware/auth";
import { streamCertificate } from "../../lib/certificate";

const router = Router();
router.use(authMiddleware);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const attempts = await prisma.attempt.findMany({
      where: { studentId: req.user!.userId, status: { in: ["SUBMITTED", "EXPIRED"] } },
      include: {
        test: { include: { subject: true } },
        answers: { include: { question: { select: { marks: true } } } },
      },
      orderBy: { endTime: "desc" },
    });

    res.json(
      attempts.map((a) => ({
        attemptId: a.id,
        testName: a.test.name,
        subjectName: a.test.subject.name,
        status: a.status,
        gradingStatus: a.gradingStatus,
        startTime: a.startTime,
        endTime: a.endTime,
        score: a.score ?? 0,
        totalMarks: a.answers.reduce((sum, ans) => sum + ans.question.marks, 0),
      }))
    );
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
    const isAdmin = req.user!.role === "ADMIN";
    const isOwningReviewer = req.user!.role === "STUDY_CENTER" && attempt.test.ownerId === req.user!.userId;
    if (!isOwner && !isAdmin && !isOwningReviewer) throw new HttpError(403, "Forbidden");

    if (attempt.status === "IN_PROGRESS") {
      throw new HttpError(409, "This attempt has not finished yet");
    }

    const answers = await prisma.answer.findMany({
      where: { attemptId },
      include: {
        question: { include: { options: { orderBy: { order: "asc" } } } },
        selections: true,
      },
      orderBy: { order: "asc" },
    });

    const totalMarks = answers.reduce((sum, a) => sum + a.question.marks, 0);

    res.json({
      attemptId: attempt.id,
      testName: attempt.test.name,
      subjectName: attempt.test.subject.name,
      status: attempt.status,
      gradingStatus: attempt.gradingStatus,
      score: attempt.score ?? 0,
      totalMarks,
      questions: answers.map((a) => ({
        questionId: a.questionId,
        type: a.question.type,
        text: a.question.text,
        marks: a.question.marks,
        options: a.question.options.map((o) => ({ id: o.id, text: o.text, isCorrect: o.isCorrect })),
        selectedOptionIds: a.selections.map((s) => s.optionId),
        textResponse: a.textResponse,
        state: a.state,
        awarded: a.awardedMarks,
      })),
    });
  })
);

router.get(
  "/:attemptId/certificate",
  asyncHandler(async (req, res) => {
    const attemptId = z.coerce.number().int().parse(req.params.attemptId);
    const attempt = await prisma.attempt.findUnique({
      where: { id: attemptId },
      include: {
        student: { select: { name: true } },
        test: { include: { subject: true } },
        answers: { include: { question: { select: { marks: true } } } },
      },
    });
    if (!attempt) throw new HttpError(404, "Result not found");

    const isOwner = attempt.studentId === req.user!.userId;
    const isAdmin = req.user!.role === "ADMIN";
    const isOwningReviewer = req.user!.role === "STUDY_CENTER" && attempt.test.ownerId === req.user!.userId;
    if (!isOwner && !isAdmin && !isOwningReviewer) throw new HttpError(403, "Forbidden");
    if (attempt.status === "IN_PROGRESS") throw new HttpError(409, "This attempt has not finished yet");

    const totalMarks = attempt.answers.reduce((sum, a) => sum + a.question.marks, 0);
    streamCertificate(res, {
      studentName: attempt.student.name,
      testName: attempt.test.name,
      subjectName: attempt.test.subject.name,
      score: attempt.score ?? 0,
      totalMarks,
      date: attempt.endTime ?? new Date(),
      provisional: attempt.gradingStatus === "PENDING_REVIEW",
    });
  })
);

export default router;
