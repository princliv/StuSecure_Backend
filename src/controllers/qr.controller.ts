import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { qrService } from "../services/qr.service.js";

export const getMyQR = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, "Not authenticated");
  if (!req.orgId) throw new ApiError(400, "Organization context missing");

  const result = await qrService.me(req.user, req.orgId);
  res.status(200).json(result);
});

export const rotateQR = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, "Not authenticated");
  if (!req.orgId) throw new ApiError(400, "Organization context missing");

  const result = await qrService.rotate(req.user, req.orgId);
  res.status(200).json(result);
});
