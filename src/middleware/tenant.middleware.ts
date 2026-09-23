import type { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/ApiError.js";

/**
 * Attaches the active organization to the request. Must run after
 * `requireAuth`. v1: a user belongs to exactly one organization, so this
 * just promotes `req.user.organizationId` to `req.orgId` — the single place
 * every repository reads the tenant scope from. When multi-org membership
 * lands (docs/StuSecure_SaaS_Plan.md Group G), this is the only place that
 * needs to change to resolve an *active* org (e.g. from an `X-Org-Id`
 * header validated against the user's memberships).
 */
export function attachTenant(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) {
    throw new ApiError(401, "Not authenticated");
  }
  req.orgId = req.user.organizationId;
  next();
}
