import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { monitoringService } from "../services/monitoring.service.js";

export const getMonitoringSnapshot = asyncHandler(async (req: Request, res: Response) => {
  if (!req.orgId) throw new ApiError(400, "Organization context missing");
  const result = await monitoringService.snapshot(req.orgId);
  res.status(200).json(result);
});
