import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { requirePlatformAdmin } from "../middleware/platform.middleware.js";
import {
  getOrganization,
  getStats,
  listOrganizations,
  updateOrganization,
} from "../controllers/platform.controller.js";

/**
 * Platform super-admin routes — cross-tenant by design, so `attachTenant`
 * is deliberately NOT used here. Gated by `requirePlatformAdmin` instead of
 * `requireRole`. See docs/StuSecure_SaaS_Plan.md Group G3.
 */
export const platformRouter = Router();
platformRouter.use(requireAuth, requirePlatformAdmin);

platformRouter.get("/organizations", listOrganizations);
platformRouter.get("/organizations/:id", getOrganization);
platformRouter.patch("/organizations/:id", updateOrganization);
platformRouter.get("/stats", getStats);
