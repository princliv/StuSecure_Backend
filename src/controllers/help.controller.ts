import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { helpService } from "../services/help.service.js";
import { assignHelpSchema, createHelpSchema } from "../validators/help.validators.js";

export const createHelp = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, "Not authenticated");
  if (!req.orgId) throw new ApiError(400, "Organization context missing");
  const body = createHelpSchema.parse(req.body ?? {});
  const result = await helpService.create(req.user, req.orgId, body);
  res.status(201).json(result);
});

export const listMyHelp = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, "Not authenticated");
  if (!req.orgId) throw new ApiError(400, "Organization context missing");
  const result = await helpService.listMine(req.user, req.orgId, req.query);
  res.status(200).json(result);
});

export const listHelp = asyncHandler(async (req: Request, res: Response) => {
  if (!req.orgId) throw new ApiError(400, "Organization context missing");
  const result = await helpService.list(req.orgId, req.query);
  res.status(200).json(result);
});

export const assignHelp = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, "Not authenticated");
  if (!req.orgId) throw new ApiError(400, "Organization context missing");
  const body = assignHelpSchema.parse(req.body ?? {});
  const result = await helpService.assign(
    req.user,
    req.orgId,
    req.params.id as string,
    body,
  );
  res.status(200).json(result);
});

export const resolveHelp = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, "Not authenticated");
  if (!req.orgId) throw new ApiError(400, "Organization context missing");
  const result = await helpService.resolve(
    req.user,
    req.orgId,
    req.params.id as string,
  );
  res.status(200).json(result);
});

export const cancelHelp = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, "Not authenticated");
  if (!req.orgId) throw new ApiError(400, "Organization context missing");
  const result = await helpService.cancel(
    req.user,
    req.orgId,
    req.params.id as string,
  );
  res.status(200).json(result);
});
