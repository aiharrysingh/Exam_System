import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { asyncHandler, HttpError } from "../../lib/asyncHandler";
import { authMiddleware, requireRole } from "../../middleware/auth";
import { assertOwnerOrAdmin, newOwnerId, ownerFilter } from "../../lib/ownership";

const router = Router();

const subjectSchema = z.object({ name: z.string().min(1) });

router.get(
  "/",
  authMiddleware,
  asyncHandler(async (req, res) => {
    // Students see every subject (tests are platform-wide, unscoped by owner);
    // Admin sees everything (oversight); a Test Conductor sees only its own.
    const where = req.user!.role === "STUDENT" ? {} : ownerFilter(req);
    const subjects = await prisma.subject.findMany({
      where,
      include: { tests: { select: { id: true } } },
      orderBy: { name: "asc" },
    });
    const withCounts = await Promise.all(
      subjects.map(async ({ tests, ...s }) => ({
        ...s,
        testCount: tests.length,
        questionCount: await prisma.testQuestion.count({ where: { testId: { in: tests.map((t) => t.id) } } }),
      }))
    );
    res.json(withCounts);
  })
);

router.post(
  "/",
  authMiddleware,
  requireRole("ADMIN", "STUDY_CENTER"),
  asyncHandler(async (req, res) => {
    const body = subjectSchema.parse(req.body);
    const subject = await prisma.subject.create({ data: { ...body, ownerId: newOwnerId(req) } });
    res.status(201).json(subject);
  })
);

router.put(
  "/:id",
  authMiddleware,
  requireRole("ADMIN", "STUDY_CENTER"),
  asyncHandler(async (req, res) => {
    const id = z.coerce.number().int().parse(req.params.id);
    const existing = await prisma.subject.findUnique({ where: { id } });
    if (!existing) throw new HttpError(404, "Subject not found");
    assertOwnerOrAdmin(req, existing);
    const body = subjectSchema.parse(req.body);
    const subject = await prisma.subject.update({ where: { id }, data: body });
    res.json(subject);
  })
);

router.delete(
  "/:id",
  authMiddleware,
  requireRole("ADMIN", "STUDY_CENTER"),
  asyncHandler(async (req, res) => {
    const id = z.coerce.number().int().parse(req.params.id);
    const existing = await prisma.subject.findUnique({ where: { id } });
    if (!existing) throw new HttpError(404, "Subject not found");
    assertOwnerOrAdmin(req, existing);
    await prisma.subject.delete({ where: { id } });
    res.status(204).send();
  })
);

export default router;
