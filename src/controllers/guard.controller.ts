import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { guardService } from "../services/guard.service.js";
import {
  createGuardBodySchema,
  updateGuardBodySchema,
} from "../validators/guard.validators.js";

export const listGuards = asyncHandler(async (req: Request, res: Response) => {
  if (!req.orgId) throw new ApiError(400, "Organization context missing");
  const result = await guardService.list(req.orgId, req.query);
  res.status(200).json(result);
});

export const createGuard = asyncHandler(async (req: Request, res: Response) => {
  if (!req.orgId) throw new ApiError(400, "Organization context missing");
  const body = createGuardBodySchema.parse(req.body);
  const result = await guardService.create(req.orgId, body, req.user?.id ?? null);
  res.status(201).json(result);
});

export const updateGuard = asyncHandler(async (req: Request, res: Response) => {
  if (!req.orgId) throw new ApiError(400, "Organization context missing");
  const body = updateGuardBodySchema.parse(req.body);
  const result = await guardService.update(req.orgId, req.params.id as string, body, req.user?.id ?? null);
  res.status(200).json(result);
});

export const deleteGuard = asyncHandler(async (req: Request, res: Response) => {
  if (!req.orgId) throw new ApiError(400, "Organization context missing");
  await guardService.remove(req.orgId, req.params.id as string, req.user?.id ?? null);
  res.status(204).send();
});
