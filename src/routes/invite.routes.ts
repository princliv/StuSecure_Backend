import { Router } from "express";
import { verifyFirebaseToken } from "../middleware/auth.middleware.js";
import { acceptInvite, previewInvite } from "../controllers/invite.controller.js";

/**
 * Public/token-based invite routes, mounted at top-level `/invites` (not
 * nested under `/orgs/:id`, since the token itself resolves the org — see
 * docs/StuSecure_SaaS_Plan.md Group G pass 2). The org-scoped
 * create/list/revoke/import endpoints live in `orgs.routes.ts` under
 * `/orgs/:id/invites`.
 */
export const inviteRouter = Router();

// No auth at all: used by the mobile accept-invite screen before login.
inviteRouter.get("/:token", previewInvite);

// verifyFirebaseToken only (not requireAuth): the invitee may not have a
// StuSecure User row yet — same middleware POST /auth/sync uses.
inviteRouter.post("/:token/accept", verifyFirebaseToken, acceptInvite);
