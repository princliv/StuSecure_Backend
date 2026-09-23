import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { attachTenant } from "../middleware/tenant.middleware.js";
import { requireRole } from "../middleware/rbac.middleware.js";
import {
  assignHelp,
  cancelHelp,
  createHelp,
  listHelp,
  listMyHelp,
  resolveHelp,
} from "../controllers/help.controller.js";

export const helpRouter = Router();

helpRouter.use(requireAuth, attachTenant);

helpRouter.post("/", requireRole("STUDENT"), createHelp);
helpRouter.get("/me", requireRole("STUDENT"), listMyHelp);
helpRouter.get("/", requireRole("FACULTY", "ADMIN"), listHelp);
helpRouter.patch("/:id/assign", requireRole("FACULTY", "ADMIN"), assignHelp);
helpRouter.patch("/:id/resolve", requireRole("FACULTY", "ADMIN"), resolveHelp);
helpRouter.patch("/:id/cancel", requireRole("STUDENT", "FACULTY", "ADMIN"), cancelHelp);
