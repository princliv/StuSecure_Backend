import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { orgsService } from "../services/orgs.service.js";
import { createOrgSchema } from "../validators/orgs.validators.js";

/**
 * GET /api/orgs/mine
 * Returns every organization the caller belongs to.
 */
export const getMine = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, "Not authenticated");
  const result = orgsService.mine(req.user);
  res.status(200).json(result);
});

/**
 * POST /api/orgs/:id/switch
 * Succeeds only if `:id` is one of the caller's memberships.
 */
export const switchOrg = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, "Not authenticated");
  // Express 5 types req.params values as string | string[]; :id is always a plain string.
  const result = orgsService.switch(req.user, req.params.id as string);
  res.status(200).json(result);
});

/**
 * POST /api/orgs
 * Creates a new Organization and makes the caller its first ADMIN member.
 */
export const createOrg = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, "Not authenticated");

  const parsed = createOrgSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.issues[0]?.message ?? "Invalid organization data");
  }

  const result = await orgsService.create(req.user.id, parsed.data.name);
  res.status(201).json(result);
});

/**
 * GET /api/orgs/:id/plan-usage
 * Current membership counts vs the org's plan limits, per role.
 */
export const getPlanUsage = asyncHandler(async (req: Request, res: Response) => {
  if (!req.orgId) throw new ApiError(400, "Organization context missing");
  const result = await orgsService.planUsage(req.orgId);
  res.status(200).json(result);
});
