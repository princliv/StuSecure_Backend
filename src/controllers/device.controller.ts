import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { deviceService } from "../services/device.service.js";
import { registerDeviceSchema } from "../validators/device.validators.js";

export const registerDevice = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, "Not authenticated");
  if (!req.orgId) throw new ApiError(400, "Organization context missing");
  const body = registerDeviceSchema.parse(req.body ?? {});
  const result = await deviceService.register(req.user, req.orgId, body);
  res.status(200).json(result);
});
