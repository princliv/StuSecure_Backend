import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { roomService } from "../services/room.service.js";
import {
  createRoomBodySchema,
  updateRoomBodySchema,
} from "../validators/room.validators.js";

export const listRooms = asyncHandler(async (req: Request, res: Response) => {
  if (!req.orgId) throw new ApiError(400, "Organization context missing");
  const result = await roomService.list(req.orgId, req.query);
  res.status(200).json(result);
});

export const createRoom = asyncHandler(async (req: Request, res: Response) => {
  if (!req.orgId) throw new ApiError(400, "Organization context missing");
  const body = createRoomBodySchema.parse(req.body);
  const result = await roomService.create(req.orgId, body);
  res.status(201).json(result);
});

export const updateRoom = asyncHandler(async (req: Request, res: Response) => {
  if (!req.orgId) throw new ApiError(400, "Organization context missing");
  const body = updateRoomBodySchema.parse(req.body);
  const result = await roomService.update(req.orgId, req.params.id as string, body);
  res.status(200).json(result);
});

export const deleteRoom = asyncHandler(async (req: Request, res: Response) => {
  if (!req.orgId) throw new ApiError(400, "Organization context missing");
  await roomService.remove(req.orgId, req.params.id as string);
  res.status(204).send();
});
