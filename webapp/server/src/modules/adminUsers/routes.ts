import { Router } from "express";
import bcrypt from "bcrypt";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { asyncHandler, HttpError } from "../../lib/asyncHandler";
import { authMiddleware, requireRole } from "../../middleware/auth";

const router = Router();
router.use(authMiddleware, requireRole("ADMIN"));

const roleParam = z.enum(["STUDENT", "STUDY_CENTER"]);

const createSchema = z.object({
  role: roleParam,
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  contactNo: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  pincode: z.string().optional(),
});

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  contactNo: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  pincode: z.string().optional(),
  newPassword: z.string().min(8).optional(),
});

function toDto(u: {
  id: number;
  role: string;
  name: string;
  email: string;
  contactNo: string | null;
  address: string | null;
  city: string | null;
  pincode: string | null;
  createdAt: Date;
}) {
  return {
    id: u.id,
    role: u.role,
    name: u.name,
    email: u.email,
    contactNo: u.contactNo,
    address: u.address,
    city: u.city,
    pincode: u.pincode,
    createdAt: u.createdAt,
  };
}

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const role = roleParam.parse(req.query.role);
    const users = await prisma.user.findMany({ where: { role }, orderBy: { name: "asc" } });
    res.json(users.map(toDto));
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const body = createSchema.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { email: body.email } });
    if (existing) throw new HttpError(409, "An account with this email already exists");
    const passwordHash = await bcrypt.hash(body.password, 12);
    const user = await prisma.user.create({
      data: {
        role: body.role,
        name: body.name,
        email: body.email,
        passwordHash,
        contactNo: body.contactNo,
        address: body.address,
        city: body.city,
        pincode: body.pincode,
      },
    });
    res.status(201).json(toDto(user));
  })
);

router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = z.coerce.number().int().parse(req.params.id);
    const body = updateSchema.parse(req.body);
    const data: Record<string, unknown> = {
      name: body.name,
      contactNo: body.contactNo,
      address: body.address,
      city: body.city,
      pincode: body.pincode,
    };
    if (body.newPassword) data.passwordHash = await bcrypt.hash(body.newPassword, 12);
    const user = await prisma.user.update({ where: { id }, data });
    res.json(toDto(user));
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = z.coerce.number().int().parse(req.params.id);
    const [subjects, tests, questions, attempts] = await Promise.all([
      prisma.subject.count({ where: { ownerId: id } }),
      prisma.test.count({ where: { ownerId: id } }),
      prisma.question.count({ where: { ownerId: id } }),
      prisma.attempt.count({ where: { studentId: id } }),
    ]);
    if (subjects || tests || questions || attempts) {
      throw new HttpError(
        409,
        "This account still owns content or has attempt history — remove or reassign it first"
      );
    }
    await prisma.user.delete({ where: { id } });
    res.status(204).send();
  })
);

export default router;
