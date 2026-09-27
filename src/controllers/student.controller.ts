import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { studentService } from "../services/student.service.js";
import {
  createStudentBodySchema,
  updateStudentBodySchema,
} from "../validators/student.validators.js";

export const listStudents = asyncHandler(async (req: Request, res: Response) => {
  if (!req.orgId) throw new ApiError(400, "Organization context missing");
  const result = await studentService.list(req.orgId, req.query);
  res.status(200).json(result);
});

export const getMyStudent = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, "Not authenticated");
  if (!req.orgId) throw new ApiError(400, "Organization context missing");
  const result = await studentService.me(req.user, req.orgId);
  res.status(200).json(result);
});

export const getStudentById = asyncHandler(async (req: Request, res: Response) => {
  if (!req.orgId) throw new ApiError(400, "Organization context missing");
  const result = await studentService.getById(req.orgId, req.params.id as string);
  res.status(200).json(result);
});

export const createStudent = asyncHandler(async (req: Request, res: Response) => {
  if (!req.orgId) throw new ApiError(400, "Organization context missing");
  const body = createStudentBodySchema.parse(req.body);
  const result = await studentService.create(req.orgId, body);
  res.status(201).json(result);
});

export const updateStudent = asyncHandler(async (req: Request, res: Response) => {
  if (!req.orgId) throw new ApiError(400, "Organization context missing");
  const body = updateStudentBodySchema.parse(req.body);
  const result = await studentService.update(req.orgId, req.params.id as string, body);
  res.status(200).json(result);
});

export const deleteStudent = asyncHandler(async (req: Request, res: Response) => {
  if (!req.orgId) throw new ApiError(400, "Organization context missing");
  await studentService.remove(req.orgId, req.params.id as string);
  res.status(204).send();
});
