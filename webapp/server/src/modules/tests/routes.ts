import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { asyncHandler, HttpError } from "../../lib/asyncHandler";
import { authMiddleware, requireRole } from "../../middleware/auth";
import { assertOwnerOrAdmin, newOwnerId, ownerFilter } from "../../lib/ownership";

const router = Router();

const testSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  code: z.string().min(1),
  subjectId: z.coerce.number().int(),
  durationMin: z.coerce.number().int().positive(),
  availableFrom: z.coerce.date(),
  availableTo: z.coerce.date(),
  isPractice: z.boolean().optional(),
  shuffleQuestions: z.boolean().optional(),
  poolSize: z.coerce.number().int().positive().nullable().optional(),
});

// Public (student-facing) shape — never includes the test `code` or `ownerId`.
function toStudentTest(t: {
  id: number;
  name: string;
  description: string | null;
  durationMin: number;
  availableFrom: Date;
  availableTo: Date;
  isPractice: boolean;
  subject: { id: number; name: string };
  _count?: { testQuestions: number };
}) {
  return {
    id: t.id,
    name: t.name,
    description: t.description,
    durationMin: t.durationMin,
    availableFrom: t.availableFrom,
    availableTo: t.availableTo,
    isPractice: t.isPractice,
    subject: t.subject,
    totalQuestions: t._count?.testQuestions ?? 0,
  };
}

router.get(
  "/",
  authMiddleware,
  asyncHandler(async (req, res) => {
    if (req.user!.role === "ADMIN" || req.user!.role === "STUDY_CENTER") {
      const tests = await prisma.test.findMany({
        where: ownerFilter(req),
        include: { subject: true, _count: { select: { testQuestions: true } } },
        orderBy: { createdAt: "desc" },
      });
      return res.json(
        tests.map(({ _count, ...t }) => ({ ...t, totalQuestions: _count.testQuestions }))
      );
    }

    // STUDENT: published, currently within its availability window, not already attempted —
    // unscoped by owner, matching the legacy's owner-agnostic student test listing.
    const now = new Date();
    const attempted = await prisma.attempt.findMany({
      where: { studentId: req.user!.userId },
      select: { testId: true },
    });
    const attemptedIds = attempted.map((a) => a.testId);

    const tests = await prisma.test.findMany({
      where: {
        isPublished: true,
        availableFrom: { lte: now },
        availableTo: { gte: now },
        id: { notIn: attemptedIds },
      },
      include: { subject: true, _count: { select: { testQuestions: true } } },
      orderBy: { availableTo: "asc" },
    });
    res.json(tests.map(toStudentTest));
  })
);

router.get(
  "/:id",
  authMiddleware,
  requireRole("ADMIN", "STUDY_CENTER"),
  asyncHandler(async (req, res) => {
    const id = z.coerce.number().int().parse(req.params.id);
    const test = await prisma.test.findUnique({
      where: { id },
      include: {
        subject: true,
        testQuestions: { include: { question: { include: { options: true } } }, orderBy: { order: "asc" } },
      },
    });
    if (!test) throw new HttpError(404, "Test not found");
    assertOwnerOrAdmin(req, test);
    res.json(test);
  })
);

async function assertOwnsSubject(req: import("express").Request, subjectId: number) {
  if (req.user!.role === "ADMIN") return;
  const subject = await prisma.subject.findUnique({ where: { id: subjectId } });
  if (!subject || subject.ownerId !== req.user!.userId) {
    throw new HttpError(403, "You can only create tests under your own subjects");
  }
}

router.post(
  "/",
  authMiddleware,
  requireRole("ADMIN", "STUDY_CENTER"),
  asyncHandler(async (req, res) => {
    const body = testSchema.parse(req.body);
    await assertOwnsSubject(req, body.subjectId);
    const test = await prisma.test.create({ data: { ...body, ownerId: newOwnerId(req) } });
    res.status(201).json(test);
  })
);

router.put(
  "/:id",
  authMiddleware,
  requireRole("ADMIN", "STUDY_CENTER"),
  asyncHandler(async (req, res) => {
    const id = z.coerce.number().int().parse(req.params.id);
    const existing = await prisma.test.findUnique({ where: { id } });
    if (!existing) throw new HttpError(404, "Test not found");
    assertOwnerOrAdmin(req, existing);
    const body = testSchema.partial().parse(req.body);
    if (body.subjectId !== undefined) await assertOwnsSubject(req, body.subjectId);
    const test = await prisma.test.update({ where: { id }, data: body });
    res.json(test);
  })
);

router.delete(
  "/:id",
  authMiddleware,
  requireRole("ADMIN", "STUDY_CENTER"),
  asyncHandler(async (req, res) => {
    const id = z.coerce.number().int().parse(req.params.id);
    const existing = await prisma.test.findUnique({ where: { id } });
    if (!existing) throw new HttpError(404, "Test not found");
    assertOwnerOrAdmin(req, existing);
    await prisma.test.delete({ where: { id } });
    res.status(204).send();
  })
);

router.post(
  "/:id/publish",
  authMiddleware,
  requireRole("ADMIN", "STUDY_CENTER"),
  asyncHandler(async (req, res) => {
    const id = z.coerce.number().int().parse(req.params.id);
    const existing = await prisma.test.findUnique({ where: { id } });
    if (!existing) throw new HttpError(404, "Test not found");
    assertOwnerOrAdmin(req, existing);

    const questionCount = await prisma.testQuestion.count({ where: { testId: id } });
    if (questionCount === 0) {
      throw new HttpError(400, "Cannot publish a test with no questions");
    }
    if (existing.poolSize && existing.poolSize > questionCount) {
      throw new HttpError(400, "Question pool size cannot exceed the number of attached questions");
    }
    const test = await prisma.test.update({ where: { id }, data: { isPublished: true } });
    res.json(test);
  })
);

export default router;
