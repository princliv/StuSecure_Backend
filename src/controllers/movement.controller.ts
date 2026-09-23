import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { movementService } from "../services/movement.service.js";
import { scanBodySchema } from "../validators/movement.validators.js";

export const scanMovement = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, "Not authenticated");
  if (!req.orgId) throw new ApiError(400, "Organization context missing");

  const body = scanBodySchema.parse(req.body);
  const result = await movementService.scan(req.user, req.orgId, body);
  res.status(201).json(result);
});

export const getMyMovements = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, "Not authenticated");
  if (!req.orgId) throw new ApiError(400, "Organization context missing");

  const result = await movementService.me(req.user, req.orgId, req.query);
  res.status(200).json(result);
});

export const listMovements = asyncHandler(async (req: Request, res: Response) => {
  if (!req.orgId) throw new ApiError(400, "Organization context missing");

  const result = await movementService.list(req.orgId, req.query);
  res.status(200).json(result);
});
