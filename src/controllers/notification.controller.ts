import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { notificationService } from "../services/notification.service.js";

export const listNotifications = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, "Not authenticated");
  if (!req.orgId) throw new ApiError(400, "Organization context missing");
  const result = await notificationService.listMine(req.user, req.orgId, req.query);
  res.status(200).json(result);
});

export const markNotificationRead = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, "Not authenticated");
  if (!req.orgId) throw new ApiError(400, "Organization context missing");
  const result = await notificationService.markRead(
    req.user,
    req.orgId,
    req.params.id as string,
  );
  res.status(200).json(result);
});

export const markAllNotificationsRead = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, "Not authenticated");
  if (!req.orgId) throw new ApiError(400, "Organization context missing");
  const result = await notificationService.markAllRead(req.user, req.orgId);
  res.status(200).json(result);
});
