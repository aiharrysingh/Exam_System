import { Request } from "express";
import { HttpError } from "./asyncHandler";

/**
 * Admin has unscoped oversight (matches the legacy admin/*.php queries, which
 * carry no tcid filter at all); a STUDY_CENTER (test conductor) account only
 * ever sees its own content. Use in every list/read query on owned models.
 */
export function ownerFilter(req: Request): { ownerId?: number } {
  return req.user!.role === "ADMIN" ? {} : { ownerId: req.user!.userId };
}

export function newOwnerId(req: Request): number | null {
  return req.user!.role === "ADMIN" ? null : req.user!.userId;
}

/** Throws 403 unless the caller is ADMIN or actually owns the row. */
export function assertOwnerOrAdmin(req: Request, row: { ownerId: number | null }): void {
  if (req.user!.role === "ADMIN") return;
  if (row.ownerId === req.user!.userId) return;
  throw new HttpError(403, "Forbidden");
}
