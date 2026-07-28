import { Router } from "express";
import bcrypt from "bcrypt";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../lib/asyncHandler";
import { authMiddleware, requireRole } from "../../middleware/auth";

const router = Router();

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  contactNo: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  pincode: z.string().optional(),
  newPassword: z.string().min(6).optional(),
});

router.use(authMiddleware, requireRole("STUDENT"));

router.get(
  "/me",
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.userId } });
    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      contactNo: user.contactNo,
      address: user.address,
      city: user.city,
      pincode: user.pincode,
    });
  })
);

router.put(
  "/me",
  asyncHandler(async (req, res) => {
    const body = updateSchema.parse(req.body);
    const data: Record<string, unknown> = {
      name: body.name,
      contactNo: body.contactNo,
      address: body.address,
      city: body.city,
      pincode: body.pincode,
    };
    if (body.newPassword) {
      data.passwordHash = await bcrypt.hash(body.newPassword, 12);
    }
    // req.user!.userId is the only source of "which student" — never trust a client-supplied id here.
    const user = await prisma.user.update({ where: { id: req.user!.userId }, data });
    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      contactNo: user.contactNo,
      address: user.address,
      city: user.city,
      pincode: user.pincode,
    });
  })
);

export default router;
