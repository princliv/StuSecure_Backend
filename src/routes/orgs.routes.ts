import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { attachTenant, requireOwnOrgParam } from "../middleware/tenant.middleware.js";
import { requireRole } from "../middleware/rbac.middleware.js";
import { createOrg, getMine, getPlanUsage, switchOrg } from "../controllers/orgs.controller.js";
import {
  createInvite,
  importInvites,
  listInvites,
  revokeInvite,
} from "../controllers/invite.controller.js";

export const orgsRouter = Router();

// requireAuth only (no attachTenant) on every route here: a user may have
// zero or multiple memberships, both of which attachTenant would reject —
// see docs/StuSecure_SaaS_Plan.md Group G.
orgsRouter.get("/mine", requireAuth, getMine);
orgsRouter.post("/:id/switch", requireAuth, switchOrg);
orgsRouter.post("/", requireAuth, createOrg);

// Invite management — org-scoped, ADMIN-only, and `:id` must equal the
// caller's active org (requireOwnOrgParam, after attachTenant resolves
// req.orgId) so an admin can't invite into / list / revoke invites for a
// different org just by changing the URL. Folded into orgs.routes.ts
// (rather than a separate invite.routes.ts) since these are nested under
// /orgs/:id/invites — see pass 2 of docs/StuSecure_SaaS_Plan.md Group G.
const inviteAdminGuards = [
  requireAuth,
  attachTenant,
  requireRole("ADMIN"),
  requireOwnOrgParam,
] as const;

orgsRouter.post("/:id/invites", ...inviteAdminGuards, createInvite);
orgsRouter.get("/:id/invites", ...inviteAdminGuards, listInvites);
orgsRouter.delete("/:id/invites/:inviteId", ...inviteAdminGuards, revokeInvite);
orgsRouter.post("/:id/invites/import", ...inviteAdminGuards, importInvites);

// Plan usage — same ADMIN-only, own-org-only guard pattern as invites. See
// docs/StuSecure_SaaS_Plan.md Group G2.
orgsRouter.get("/:id/plan-usage", ...inviteAdminGuards, getPlanUsage);
