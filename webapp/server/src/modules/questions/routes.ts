import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { asyncHandler, HttpError } from "../../lib/asyncHandler";
import { authMiddleware, requireRole } from "../../middleware/auth";
import { assertOwnerOrAdmin, newOwnerId, ownerFilter } from "../../lib/ownership";
import { importQuestions, parseQuestionsCsv } from "./csvImport";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 1024 * 1024 } });

const authoring = [authMiddleware, requireRole("ADMIN", "STUDY_CENTER")];

const optionInput = z.object({
  text: z.string().min(1),
  isCorrect: z.boolean().optional(),
  order: z.number().int().optional(),
});

const questionTypeSchema = z.enum(["SINGLE_CHOICE", "MULTI_SELECT", "TRUE_FALSE", "SHORT_ANSWER"]);

const questionSchema = z.object({
  type: questionTypeSchema.optional(),
  text: z.string().min(1),
  marks: z.coerce.number().int().positive().optional(),
  negativeMarks: z.coerce.number().int().min(0).optional(),
  allowPartialCredit: z.boolean().optional(),
  tags: z.array(z.string().min(1)).optional(),
  options: z.array(optionInput).optional(),
});

function requiresOptions(type: string | undefined) {
  return type !== "SHORT_ANSWER";
}

async function loadOwnedQuestion(id: number, req: import("express").Request) {
  const question = await prisma.question.findUnique({ where: { id } });
  if (!question) throw new HttpError(404, "Question not found");
  assertOwnerOrAdmin(req, question);
  return question;
}

/** Mounted at /api/tests — question-authoring hangs off a specific test. */
export const testQuestionsRouter = Router();

async function loadOwnedTest(testId: number, req: import("express").Request) {
  const test = await prisma.test.findUnique({ where: { id: testId } });
  if (!test) throw new HttpError(404, "Test not found");
  assertOwnerOrAdmin(req, test);
  return test;
}

testQuestionsRouter.get(
  "/:testId/questions",
  ...authoring,
  asyncHandler(async (req, res) => {
    const testId = z.coerce.number().int().parse(req.params.testId);
    await loadOwnedTest(testId, req);
    const links = await prisma.testQuestion.findMany({
      where: { testId },
      include: { question: { include: { options: { orderBy: { order: "asc" } }, tags: true } } },
      orderBy: { order: "asc" },
    });
    res.json(links.map((l) => ({ testQuestionId: l.id, order: l.order, ...l.question })));
  })
);

const attachSchema = z.union([
  z.object({ questionId: z.number().int() }),
  questionSchema,
]);

testQuestionsRouter.post(
  "/:testId/questions",
  ...authoring,
  asyncHandler(async (req, res) => {
    const testId = z.coerce.number().int().parse(req.params.testId);
    await loadOwnedTest(testId, req);
    const body = attachSchema.parse(req.body);
    const existingCount = await prisma.testQuestion.count({ where: { testId } });

    let questionId: number;
    if ("questionId" in body) {
      // Attach an existing bank question — must be owned by the same account (or global, for admin).
      await loadOwnedQuestion(body.questionId, req);
      questionId = body.questionId;
    } else {
      if (requiresOptions(body.type) && (!body.options || body.options.length < 2)) {
        throw new HttpError(400, "This question type needs at least 2 options");
      }
      const created = await prisma.question.create({
        data: {
          ownerId: newOwnerId(req),
          type: body.type ?? "SINGLE_CHOICE",
          text: body.text,
          marks: body.marks ?? 1,
          negativeMarks: body.negativeMarks ?? 0,
          allowPartialCredit: body.allowPartialCredit ?? false,
          tags: body.tags
            ? { connectOrCreate: body.tags.map((name) => ({ where: { name }, create: { name } })) }
            : undefined,
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
      });
      questionId = created.id;
    }

    const link = await prisma.testQuestion.create({
      data: { testId, questionId, order: existingCount + 1 },
      include: { question: { include: { options: { orderBy: { order: "asc" } } } } },
    });
    res.status(201).json({ testQuestionId: link.id, order: link.order, ...link.question });
  })
);

testQuestionsRouter.delete(
  "/:testId/questions/:testQuestionId",
  ...authoring,
  asyncHandler(async (req, res) => {
    const testId = z.coerce.number().int().parse(req.params.testId);
    await loadOwnedTest(testId, req);
    const testQuestionId = z.coerce.number().int().parse(req.params.testQuestionId);
    await prisma.testQuestion.delete({ where: { id: testQuestionId } });
    res.status(204).send();
  })
);

testQuestionsRouter.put(
  "/:testId/questions/:testQuestionId/order",
  ...authoring,
  asyncHandler(async (req, res) => {
    const testId = z.coerce.number().int().parse(req.params.testId);
    await loadOwnedTest(testId, req);
    const testQuestionId = z.coerce.number().int().parse(req.params.testQuestionId);
    const newOrder = z.coerce.number().int().positive().parse(req.body.order);

    await prisma.$transaction(async (tx) => {
      const target = await tx.testQuestion.findUniqueOrThrow({ where: { id: testQuestionId } });
      const occupant = await tx.testQuestion.findUnique({ where: { testId_order: { testId, order: newOrder } } });
      // Sentinel swap: unique(testId, order) forbids two rows sharing a slot mid-transaction.
      await tx.testQuestion.update({ where: { id: target.id }, data: { order: -1 } });
      if (occupant) {
        await tx.testQuestion.update({ where: { id: occupant.id }, data: { order: target.order } });
      }
      await tx.testQuestion.update({ where: { id: target.id }, data: { order: newOrder } });
    });
    res.status(204).send();
  })
);

/** Mounted at /api/questions — the bank itself. */
export const questionsRouter = Router();

questionsRouter.get(
  "/",
  ...authoring,
  asyncHandler(async (req, res) => {
    const query = z
      .object({ tag: z.string().optional(), type: questionTypeSchema.optional(), q: z.string().optional() })
      .parse(req.query);
    const questions = await prisma.question.findMany({
      where: {
        ...ownerFilter(req),
        type: query.type,
        text: query.q ? { contains: query.q } : undefined,
        tags: query.tag ? { some: { name: query.tag } } : undefined,
      },
      include: { options: { orderBy: { order: "asc" } }, tags: true, _count: { select: { testLinks: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json(questions);
  })
);

questionsRouter.post(
  "/csv-import",
  ...authoring,
  upload.single("file"),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new HttpError(400, "No file uploaded (expected field name 'file')");
    const parsed = parseQuestionsCsv(req.file.buffer);
    const created = await importQuestions(parsed, newOwnerId(req));
    res.status(201).json({ created: created.length, errors: [] });
  })
);

questionsRouter.get(
  "/tags",
  ...authoring,
  asyncHandler(async (_req, res) => {
    const tags = await prisma.tag.findMany({ orderBy: { name: "asc" } });
    res.json(tags);
  })
);

questionsRouter.post(
  "/",
  ...authoring,
  asyncHandler(async (req, res) => {
    const body = questionSchema.parse(req.body);
    if (requiresOptions(body.type) && (!body.options || body.options.length < 2)) {
      throw new HttpError(400, "This question type needs at least 2 options");
    }
    const question = await prisma.question.create({
      data: {
        ownerId: newOwnerId(req),
        type: body.type ?? "SINGLE_CHOICE",
        text: body.text,
        marks: body.marks ?? 1,
        negativeMarks: body.negativeMarks ?? 0,
        allowPartialCredit: body.allowPartialCredit ?? false,
        tags: body.tags
          ? { connectOrCreate: body.tags.map((name) => ({ where: { name }, create: { name } })) }
          : undefined,
        options: body.options
          ? { create: body.options.map((o, i) => ({ text: o.text, isCorrect: o.isCorrect ?? false, order: o.order ?? i + 1 })) }
          : undefined,
      },
      include: { options: true, tags: true },
    });
    res.status(201).json(question);
  })
);

questionsRouter.put(
  "/:id",
  ...authoring,
  asyncHandler(async (req, res) => {
    const id = z.coerce.number().int().parse(req.params.id);
    await loadOwnedQuestion(id, req);
    const body = questionSchema.omit({ options: true, tags: true }).partial().parse(req.body);
    const question = await prisma.question.update({ where: { id }, data: body });
    res.json(question);
  })
);

questionsRouter.delete(
  "/:id",
  ...authoring,
  asyncHandler(async (req, res) => {
    const id = z.coerce.number().int().parse(req.params.id);
    await loadOwnedQuestion(id, req);
    const [testLinks, answers] = await Promise.all([
      prisma.testQuestion.count({ where: { questionId: id } }),
      prisma.answer.count({ where: { questionId: id } }),
    ]);
    if (testLinks > 0 || answers > 0) {
      throw new HttpError(409, "This question is attached to a test or has attempt history and cannot be deleted");
    }
    await prisma.question.delete({ where: { id } });
    res.status(204).send();
  })
);

questionsRouter.post(
  "/:id/options",
  ...authoring,
  asyncHandler(async (req, res) => {
    const questionId = z.coerce.number().int().parse(req.params.id);
    await loadOwnedQuestion(questionId, req);
    const body = optionInput.parse(req.body);
    const existingCount = await prisma.option.count({ where: { questionId } });
    const option = await prisma.option.create({
      data: { questionId, text: body.text, isCorrect: body.isCorrect ?? false, order: body.order ?? existingCount + 1 },
    });
    res.status(201).json(option);
  })
);

/** Mounted at /api/options */
export const optionsRouter = Router();

async function loadOwnedOption(id: number, req: import("express").Request) {
  const option = await prisma.option.findUnique({ where: { id }, include: { question: true } });
  if (!option) throw new HttpError(404, "Option not found");
  assertOwnerOrAdmin(req, option.question);
  return option;
}

optionsRouter.put(
  "/:id",
  ...authoring,
  asyncHandler(async (req, res) => {
    const id = z.coerce.number().int().parse(req.params.id);
    await loadOwnedOption(id, req);
    const body = optionInput.partial().parse(req.body);
    const option = await prisma.option.update({ where: { id }, data: body });
    res.json(option);
  })
);

optionsRouter.delete(
  "/:id",
  ...authoring,
  asyncHandler(async (req, res) => {
    const id = z.coerce.number().int().parse(req.params.id);
    const owned = await loadOwnedOption(id, req);
    const remaining = await prisma.option.count({ where: { questionId: owned.questionId } });
    if (remaining <= 2) {
      throw new HttpError(400, "A question must keep at least 2 options");
    }
    await prisma.option.delete({ where: { id } });
    res.status(204).send();
  })
);
