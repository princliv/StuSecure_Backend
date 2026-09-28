import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { inviteService } from "../services/invite.service.js";
import {
  createInviteBodySchema,
  importInvitesBodySchema,
} from "../validators/invite.validators.js";

// --- Org-scoped, ADMIN-only (mounted under /orgs/:id/invites) ---

export const createInvite = asyncHandler(async (req: Request, res: Response) => {
  if (!req.orgId || !req.user) throw new ApiError(400, "Organization context missing");
  const body = createInviteBodySchema.parse(req.body);
  const result = await inviteService.create(req.orgId, req.user.id, body);
  res.status(201).json(result);
});

export const listInvites = asyncHandler(async (req: Request, res: Response) => {
  if (!req.orgId) throw new ApiError(400, "Organization context missing");
  const result = await inviteService.list(req.orgId, req.query);
  res.status(200).json(result);
});

export const revokeInvite = asyncHandler(async (req: Request, res: Response) => {
  if (!req.orgId) throw new ApiError(400, "Organization context missing");
  await inviteService.revoke(req.orgId, req.params.inviteId as string);
  res.status(204).send();
});

export const importInvites = asyncHandler(async (req: Request, res: Response) => {
  if (!req.orgId || !req.user) throw new ApiError(400, "Organization context missing");
  const body = importInvitesBodySchema.parse(req.body);
  const result = await inviteService.importCsv(req.orgId, req.user.id, body.csv);
  res.status(200).json(result);
});

// --- Public / Firebase-only (mounted at top-level /invites) ---

export const previewInvite = asyncHandler(async (req: Request, res: Response) => {
  const result = await inviteService.preview(req.params.token as string);
  res.status(200).json(result);
});

export const acceptInvite = asyncHandler(async (req: Request, res: Response) => {
  if (!req.firebaseToken) throw new ApiError(401, "Not authenticated");
  const result = await inviteService.accept(req.firebaseToken, req.params.token as string);
  res.status(200).json(result);
});
