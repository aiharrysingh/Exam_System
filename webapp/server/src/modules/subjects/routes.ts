import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../lib/asyncHandler";
import { authMiddleware, requireRole } from "../../middleware/auth";

const router = Router();

const subjectSchema = z.object({ name: z.string().min(1) });

router.get(
  "/",
  authMiddleware,
  asyncHandler(async (_req, res) => {
    const subjects = await prisma.subject.findMany({ orderBy: { name: "asc" } });
    res.json(subjects);
  })
);

router.post(
  "/",
  authMiddleware,
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const body = subjectSchema.parse(req.body);
    const subject = await prisma.subject.create({ data: body });
    res.status(201).json(subject);
  })
);

router.put(
  "/:id",
  authMiddleware,
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const id = z.coerce.number().int().parse(req.params.id);
    const body = subjectSchema.parse(req.body);
    const subject = await prisma.subject.update({ where: { id }, data: body });
    res.json(subject);
  })
);

router.delete(
  "/:id",
  authMiddleware,
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const id = z.coerce.number().int().parse(req.params.id);
    await prisma.subject.delete({ where: { id } });
    res.status(204).send();
  })
);

export default router;
