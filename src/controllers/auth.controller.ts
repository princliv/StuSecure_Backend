import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { authService } from "../services/auth.service.js";
import { syncBodySchema } from "../validators/auth.validators.js";

export const syncUser = asyncHandler(async (req: Request, res: Response) => {
  if (!req.firebaseToken) {
    throw new ApiError(401, "Not authenticated");
  }

  const parsedBody = syncBodySchema.safeParse(req.body ?? {});
  const result = await authService.sync(
    req.firebaseToken,
    parsedBody.success ? parsedBody.data : undefined,
  );

  res.status(200).json(result);
});

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, "Not authenticated");
  }

  const profile = await authService.me(req.user.firebaseUid);
  res.status(200).json(profile);
});
