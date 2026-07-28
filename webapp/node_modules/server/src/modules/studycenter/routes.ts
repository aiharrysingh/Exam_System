import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { asyncHandler, HttpError } from "../../lib/asyncHandler";
import { authMiddleware, requireRole } from "../../middleware/auth";
import { assertOwnerOrAdmin, ownerFilter } from "../../lib/ownership";

const router = Router();
router.use(authMiddleware, requireRole("STUDY_CENTER", "ADMIN"));

async function loadOwnedTest(testId: number, req: import("express").Request) {
  const test = await prisma.test.findUnique({ where: { id: testId } });
  if (!test) throw new HttpError(404, "Test not found");
  assertOwnerOrAdmin(req, test);
  return test;
}

router.get(
  "/attempts",
  asyncHandler(async (req, res) => {
    const query = z
      .object({
        testId: z.coerce.number().int().optional(),
        studentId: z.coerce.number().int().optional(),
      })
      .parse(req.query);

    const attempts = await prisma.attempt.findMany({
      where: {
        testId: query.testId,
        studentId: query.studentId,
        status: { in: ["SUBMITTED", "EXPIRED"] },
        test: ownerFilter(req),
      },
      include: { student: { select: { id: true, name: true } }, test: { select: { id: true, name: true } } },
      orderBy: { endTime: "desc" },
    });

    res.json(
      attempts.map((a) => ({
        attemptId: a.id,
        studentId: a.student.id,
        studentName: a.student.name,
        testId: a.test.id,
        testName: a.test.name,
        status: a.status,
        score: a.score ?? 0,
        endTime: a.endTime,
      }))
    );
  })
);

router.get(
  "/tests/:id/stats",
  asyncHandler(async (req, res) => {
    const testId = z.coerce.number().int().parse(req.params.id);
    await loadOwnedTest(testId, req);

    // Computed per-attempt (not a test-wide aggregate) since a pooled test can hand
    // different students a different subset of questions, and therefore a different
    // maximum achievable score.
    const attempts = await prisma.attempt.findMany({
      where: { testId, status: { in: ["SUBMITTED", "EXPIRED"] } },
      include: { answers: { include: { question: { select: { marks: true } } } } },
    });

    const points = attempts.map((a) => ({
      score: a.score ?? 0,
      max: a.answers.reduce((sum, ans) => sum + ans.question.marks, 0),
    }));

    const buckets: Record<string, number> = {
      "0-20%": 0,
      "21-40%": 0,
      "41-60%": 0,
      "61-80%": 0,
      "81-100%": 0,
    };
    for (const { score, max } of points) {
      const pct = max > 0 ? (score / max) * 100 : 0;
      if (pct <= 20) buckets["0-20%"]++;
      else if (pct <= 40) buckets["21-40%"]++;
      else if (pct <= 60) buckets["41-60%"]++;
      else if (pct <= 80) buckets["61-80%"]++;
      else buckets["81-100%"]++;
    }

    const maxMarksSeen = points.length ? Math.max(...points.map((p) => p.max)) : 0;

    res.json({
      testId,
      totalMarks: maxMarksSeen,
      attemptCount: points.length,
      averageScore: points.length ? points.reduce((s, p) => s + p.score, 0) / points.length : 0,
      distribution: Object.entries(buckets).map(([bucket, count]) => ({ bucket, count })),
    });
  })
);

router.get(
  "/tests/:id/item-analysis",
  asyncHandler(async (req, res) => {
    const testId = z.coerce.number().int().parse(req.params.id);
    await loadOwnedTest(testId, req);

    const testQuestions = await prisma.testQuestion.findMany({
      where: { testId },
      include: { question: { select: { id: true, text: true, type: true, marks: true } } },
      orderBy: { order: "asc" },
    });

    const rows = await Promise.all(
      testQuestions.map(async ({ question }) => {
        const answers = await prisma.answer.findMany({
          where: { questionId: question.id, attempt: { testId, status: { in: ["SUBMITTED", "EXPIRED"] } } },
          select: { awardedMarks: true, timeSpentSec: true },
        });
        const attemptsCount = answers.length;
        const correctCount = answers.filter((a) => (a.awardedMarks ?? 0) >= question.marks).length;
        const avgTimeSpentSec = attemptsCount
          ? Math.round(answers.reduce((s, a) => s + a.timeSpentSec, 0) / attemptsCount)
          : 0;
        return {
          questionId: question.id,
          text: question.text,
          type: question.type,
          attemptsCount,
          pValue: attemptsCount ? Number((correctCount / attemptsCount).toFixed(2)) : null,
          avgTimeSpentSec,
        };
      })
    );

    res.json(rows);
  })
);

export default router;
