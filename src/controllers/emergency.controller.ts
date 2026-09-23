import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { emergencyService } from "../services/emergency.service.js";
import { createEmergencySchema } from "../validators/emergency.validators.js";

export const createEmergency = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, "Not authenticated");
  if (!req.orgId) throw new ApiError(400, "Organization context missing");
  const body = createEmergencySchema.parse(req.body ?? {});
  const result = await emergencyService.create(req.user, req.orgId, body);
  res.status(201).json(result);
});

export const listEmergencies = asyncHandler(async (req: Request, res: Response) => {
  if (!req.orgId) throw new ApiError(400, "Organization context missing");
  const result = await emergencyService.list(req.orgId, req.query);
  res.status(200).json(result);
});

export const acknowledgeEmergency = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, "Not authenticated");
  if (!req.orgId) throw new ApiError(400, "Organization context missing");
  const result = await emergencyService.acknowledge(
    req.user,
    req.orgId,
    req.params.id as string,
  );
  res.status(200).json(result);
});

export const resolveEmergency = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, "Not authenticated");
  if (!req.orgId) throw new ApiError(400, "Organization context missing");
  const result = await emergencyService.resolve(
    req.user,
    req.orgId,
    req.params.id as string,
  );
  res.status(200).json(result);
});
