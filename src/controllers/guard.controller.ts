import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { guardService } from "../services/guard.service.js";

export const listGuards = asyncHandler(async (req: Request, res: Response) => {
  if (!req.orgId) throw new ApiError(400, "Organization context missing");
  const result = await guardService.list(req.orgId, req.query);
  res.status(200).json(result);
});
