import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { orgsService } from "../services/orgs.service.js";

/**
 * GET /api/orgs/mine
 * Returns the caller's memberships (always length 1 in v1).
 */
export const getMine = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, "Not authenticated");
  const result = await orgsService.mine(req.user);
  res.status(200).json(result);
});

/**
 * POST /api/orgs/:id/switch
 * In v1 succeeds only if `:id` equals the caller's organizationId.
 */
export const switchOrg = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, "Not authenticated");
  // Express 5 types req.params values as string | string[]; :id is always a plain string.
  const result = await orgsService.switch(req.user, req.params.id as string);
  res.status(200).json(result);
});
