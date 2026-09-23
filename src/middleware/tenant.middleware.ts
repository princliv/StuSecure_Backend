import type { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/ApiError.js";

/**
 * Attaches the active organization to the request. Must run after
 * `requireAuth`. v1: a user belongs to exactly one organization, so this
 * just promotes `req.user.organizationId` to `req.orgId` — the single place
 * every repository reads the tenant scope from.
 *
 * X-Org-Id header (optional): if the client sends `X-Org-Id`, it is
 * validated against `user.organizationId`. A mismatch → 403. A match →
 * `req.orgId` is set to that value (same as the default, but explicit). When
 * multi-org membership lands (Group G), this is the only place that needs to
 * change to resolve the *active* org from the user's real Membership rows.
 */
export function attachTenant(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) {
    throw new ApiError(401, "Not authenticated");
  }

  const xOrgIdHeader = req.headers["x-org-id"];
  const xOrgId = Array.isArray(xOrgIdHeader) ? xOrgIdHeader[0] : xOrgIdHeader;

  if (xOrgId) {
    if (xOrgId !== req.user.organizationId) {
      throw new ApiError(
        403,
        "X-Org-Id does not match your organization — access denied",
      );
    }
    req.orgId = xOrgId;
  } else {
    req.orgId = req.user.organizationId;
  }

  next();
}
