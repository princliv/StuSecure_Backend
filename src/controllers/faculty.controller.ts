import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { facultyService } from "../services/faculty.service.js";
import {
  createFacultyBodySchema,
  updateFacultyBodySchema,
} from "../validators/faculty.validators.js";

export const listFaculty = asyncHandler(async (req: Request, res: Response) => {
  if (!req.orgId) throw new ApiError(400, "Organization context missing");
  const result = await facultyService.list(req.orgId, req.query);
  res.status(200).json(result);
});

export const getFaculty = asyncHandler(async (req: Request, res: Response) => {
  if (!req.orgId) throw new ApiError(400, "Organization context missing");
  const result = await facultyService.get(req.orgId, req.params.id as string);
  res.status(200).json(result);
});

export const createFaculty = asyncHandler(async (req: Request, res: Response) => {
  if (!req.orgId) throw new ApiError(400, "Organization context missing");
  const body = createFacultyBodySchema.parse(req.body);
  const result = await facultyService.create(req.orgId, body, req.user?.id ?? null);
  res.status(201).json(result);
});

export const updateFaculty = asyncHandler(async (req: Request, res: Response) => {
  if (!req.orgId) throw new ApiError(400, "Organization context missing");
  const body = updateFacultyBodySchema.parse(req.body);
  const result = await facultyService.update(req.orgId, req.params.id as string, body, req.user?.id ?? null);
  res.status(200).json(result);
});

export const deleteFaculty = asyncHandler(async (req: Request, res: Response) => {
  if (!req.orgId) throw new ApiError(400, "Organization context missing");
  await facultyService.remove(req.orgId, req.params.id as string, req.user?.id ?? null);
  res.status(204).send();
});
