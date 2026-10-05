import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { hostelService } from "../services/hostel.service.js";
import {
  createHostelBodySchema,
  updateHostelBodySchema,
} from "../validators/hostel.validators.js";

export const listHostels = asyncHandler(async (req: Request, res: Response) => {
  if (!req.orgId) throw new ApiError(400, "Organization context missing");
  const result = await hostelService.list(req.orgId, req.query);
  res.status(200).json(result);
});

export const getHostel = asyncHandler(async (req: Request, res: Response) => {
  if (!req.orgId) throw new ApiError(400, "Organization context missing");
  const result = await hostelService.get(req.orgId, req.params.id as string);
  res.status(200).json(result);
});

export const createHostel = asyncHandler(async (req: Request, res: Response) => {
  if (!req.orgId) throw new ApiError(400, "Organization context missing");
  const body = createHostelBodySchema.parse(req.body);
  const result = await hostelService.create(req.orgId, body, req.user?.id ?? null);
  res.status(201).json(result);
});

export const updateHostel = asyncHandler(async (req: Request, res: Response) => {
  if (!req.orgId) throw new ApiError(400, "Organization context missing");
  const body = updateHostelBodySchema.parse(req.body);
  const result = await hostelService.update(req.orgId, req.params.id as string, body, req.user?.id ?? null);
  res.status(200).json(result);
});

export const deleteHostel = asyncHandler(async (req: Request, res: Response) => {
  if (!req.orgId) throw new ApiError(400, "Organization context missing");
  await hostelService.remove(req.orgId, req.params.id as string, req.user?.id ?? null);
  res.status(204).send();
});
