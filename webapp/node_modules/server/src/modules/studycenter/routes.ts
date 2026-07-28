import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../lib/asyncHandler";
import { authMiddleware, requireRole } from "../../middleware/auth";

const router = Router();
router.use(authMiddleware, requireRole("STUDY_CENTER", "ADMIN"));

router.get(
  "/students",
  asyncHandler(async (_req, res) => {
    const students = await prisma.user.findMany({
      where: { role: "STUDENT" },
      select: {
        id: true,
        name: true,
        email: true,
        city: true,
        _count: { select: { attempts: true } },
      },
      orderBy: { name: "asc" },
    });
    res.json(students);
  })
);

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
    const totalMarks = await prisma.question.aggregate({ where: { testId }, _sum: { marks: true } });
    const attempts = await prisma.attempt.findMany({
      where: { testId, status: { in: ["SUBMITTED", "EXPIRED"] } },
      select: { score: true },
    });

    const scores = attempts.map((a) => a.score ?? 0);
    const buckets: Record<string, number> = {
      "0-20%": 0,
      "21-40%": 0,
      "41-60%": 0,
      "61-80%": 0,
      "81-100%": 0,
    };
    const max = totalMarks._sum.marks ?? 0;
    for (const s of scores) {
      const pct = max > 0 ? (s / max) * 100 : 0;
      if (pct <= 20) buckets["0-20%"]++;
      else if (pct <= 40) buckets["21-40%"]++;
      else if (pct <= 60) buckets["41-60%"]++;
      else if (pct <= 80) buckets["61-80%"]++;
      else buckets["81-100%"]++;
    }

    res.json({
      testId,
      totalMarks: max,
      attemptCount: scores.length,
      averageScore: scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0,
      distribution: Object.entries(buckets).map(([bucket, count]) => ({ bucket, count })),
    });
  })
);

export default router;
