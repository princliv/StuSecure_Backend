import type { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/ApiError.js";

/**
 * Guards `/platform/*` routes to platform super-admins only. Must run after
 * `requireAuth`. Deliberately does NOT run `attachTenant` — these routes are
 * cross-tenant by design, see docs/StuSecure_SaaS_Plan.md Group G3.
 */
export function requirePlatformAdmin(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) {
    throw new ApiError(401, "Not authenticated");
  }
  if (!req.user.isPlatformAdmin) {
    throw new ApiError(403, "Platform admin access required");
  }
  next();
}
