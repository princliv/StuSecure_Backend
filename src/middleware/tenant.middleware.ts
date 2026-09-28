import type { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/ApiError.js";

/**
 * Attaches the active organization to the request. Must run after
 * `requireAuth`. Resolves the *active* membership out of `req.user.memberships`:
 *
 * - `X-Org-Id` header present → must match one of the user's memberships
 *   (403 otherwise).
 * - No header, exactly one membership → use it.
 * - No header, zero memberships → 403 (no organization membership).
 * - No header, more than one membership → 400 (ambiguous, client must send
 *   `X-Org-Id` — mirrors the mobile app's `select-org.tsx` org picker).
 *
 * Sets `req.orgId`, `req.user.role`, and `req.user.organizationId` from the
 * resolved active membership.
 */
export function attachTenant(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) {
    throw new ApiError(401, "Not authenticated");
  }

  const xOrgIdHeader = req.headers["x-org-id"];
  const xOrgId = Array.isArray(xOrgIdHeader) ? xOrgIdHeader[0] : xOrgIdHeader;

  const memberships = req.user.memberships;

  if (xOrgId) {
    const membership = memberships.find((m) => m.organizationId === xOrgId);
    if (!membership) {
      throw new ApiError(
        403,
        "X-Org-Id does not match your organization — access denied",
      );
    }
    req.orgId = membership.organizationId;
    req.user.role = membership.role;
    req.user.organizationId = membership.organizationId;
  } else if (memberships.length === 1) {
    const membership = memberships[0]!;
    req.orgId = membership.organizationId;
    req.user.role = membership.role;
    req.user.organizationId = membership.organizationId;
  } else if (memberships.length === 0) {
    throw new ApiError(
      403,
      "No organization membership — accept an invite or create an organization",
    );
  } else {
    throw new ApiError(
      400,
      "Multiple organizations — X-Org-Id header required",
    );
  }

  next();
}

/**
 * Guards `:id`-scoped admin routes (e.g. `/orgs/:id/invites`) so an ADMIN
 * can only act on their own active org, not an arbitrary org id in the URL.
 * Must run after `attachTenant`. Added in pass 2 (invites) — see
 * docs/StuSecure_SaaS_Plan.md Group G.
 */
export function requireOwnOrgParam(req: Request, _res: Response, next: NextFunction) {
  if (!req.orgId) {
    throw new ApiError(400, "Organization context missing");
  }
  if (req.params.id !== req.orgId) {
    throw new ApiError(403, "Cannot act on a different organization");
  }
  next();
}
