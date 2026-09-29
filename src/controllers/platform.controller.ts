import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { platformService } from "../services/platform.service.js";
import { updateOrganizationBodySchema } from "../validators/platform.validators.js";

export const listOrganizations = asyncHandler(async (req: Request, res: Response) => {
  const result = await platformService.listOrganizations(req.query);
  res.status(200).json(result);
});

export const getOrganization = asyncHandler(async (req: Request, res: Response) => {
  const result = await platformService.getOrganization(req.params.id as string);
  res.status(200).json(result);
});

export const updateOrganization = asyncHandler(async (req: Request, res: Response) => {
  const body = updateOrganizationBodySchema.parse(req.body);
  const result = await platformService.updateOrganization(req.params.id as string, body);
  res.status(200).json(result);
});

export const getStats = asyncHandler(async (_req: Request, res: Response) => {
  const result = await platformService.stats();
  res.status(200).json(result);
});
