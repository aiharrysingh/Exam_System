import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { asyncHandler, HttpError } from "../../lib/asyncHandler";
import { authMiddleware, requireRole } from "../../middleware/auth";

const adminOnly = [authMiddleware, requireRole("ADMIN")];

const optionInput = z.object({
  text: z.string().min(1),
  isCorrect: z.boolean().optional(),
  order: z.number().int().optional(),
});

const questionSchema = z.object({
  text: z.string().min(1),
  marks: z.coerce.number().int().positive().optional(),
  order: z.coerce.number().int().optional(),
  options: z.array(optionInput).min(2).optional(),
});

// Mounted at /api/tests (alongside testRoutes/testStartRouter) — only ever
// matches its own "/:testId/questions" pattern, so it can safely share the
// prefix as long as it's registered after those two.
export const testQuestionsRouter = Router();

testQuestionsRouter.get(
  "/:testId/questions",
  ...adminOnly,
  asyncHandler(async (req, res) => {
    const testId = z.coerce.number().int().parse(req.params.testId);
    const questions = await prisma.question.findMany({
      where: { testId },
      include: { options: { orderBy: { order: "asc" } } },
      orderBy: { order: "asc" },
    });
    res.json(questions);
  })
);

testQuestionsRouter.post(
  "/:testId/questions",
  ...adminOnly,
  asyncHandler(async (req, res) => {
    const testId = z.coerce.number().int().parse(req.params.testId);
    const body = questionSchema.parse(req.body);
    const existingCount = await prisma.question.count({ where: { testId } });

    const question = await prisma.question.create({
      data: {
        testId,
        text: body.text,
        marks: body.marks ?? 1,
        order: body.order ?? existingCount + 1,
        options: body.options
          ? {
              create: body.options.map((o, i) => ({
                text: o.text,
                isCorrect: o.isCorrect ?? false,
                order: o.order ?? i + 1,
              })),
            }
          : undefined,
      },
      include: { options: true },
    });
    res.status(201).json(question);
  })
);

// Mounted at /api/questions — a prefix no other module uses, so it can never
// shadow a sibling router regardless of registration order.
export const questionsRouter = Router();

questionsRouter.put(
  "/:id",
  ...adminOnly,
  asyncHandler(async (req, res) => {
    const id = z.coerce.number().int().parse(req.params.id);
    const body = questionSchema.omit({ options: true }).partial().parse(req.body);
    const question = await prisma.question.update({ where: { id }, data: body });
    res.json(question);
  })
);

questionsRouter.delete(
  "/:id",
  ...adminOnly,
  asyncHandler(async (req, res) => {
    const id = z.coerce.number().int().parse(req.params.id);
    await prisma.question.delete({ where: { id } });
    res.status(204).send();
  })
);

questionsRouter.post(
  "/:id/options",
  ...adminOnly,
  asyncHandler(async (req, res) => {
    const questionId = z.coerce.number().int().parse(req.params.id);
    const body = optionInput.parse(req.body);
    const existingCount = await prisma.option.count({ where: { questionId } });
    const option = await prisma.option.create({
      data: {
        questionId,
        text: body.text,
        isCorrect: body.isCorrect ?? false,
        order: body.order ?? existingCount + 1,
      },
    });
    res.status(201).json(option);
  })
);

// Mounted at /api/options — likewise a unique, non-overlapping prefix.
export const optionsRouter = Router();

optionsRouter.put(
  "/:id",
  ...adminOnly,
  asyncHandler(async (req, res) => {
    const id = z.coerce.number().int().parse(req.params.id);
    const body = optionInput.partial().parse(req.body);
    const option = await prisma.option.update({ where: { id }, data: body });
    res.json(option);
  })
);

optionsRouter.delete(
  "/:id",
  ...adminOnly,
  asyncHandler(async (req, res) => {
    const id = z.coerce.number().int().parse(req.params.id);
    const remaining = await prisma.option.count({
      where: { questionId: (await prisma.option.findUniqueOrThrow({ where: { id } })).questionId },
    });
    if (remaining <= 2) {
      throw new HttpError(400, "A question must keep at least 2 options");
    }
    await prisma.option.delete({ where: { id } });
    res.status(204).send();
  })
);
