import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { attachTenant } from "../middleware/tenant.middleware.js";
import { requireRole } from "../middleware/rbac.middleware.js";
import { listGuards } from "../controllers/guard.controller.js";

export const guardRouter = Router();
guardRouter.use(requireAuth, attachTenant);
guardRouter.get("/", requireRole("FACULTY", "ADMIN"), listGuards);
