import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { attachTenant } from "../middleware/tenant.middleware.js";
import { requireRole } from "../middleware/rbac.middleware.js";
import { getMonitoringSnapshot } from "../controllers/monitoring.controller.js";

export const monitoringRouter = Router();

monitoringRouter.use(requireAuth, attachTenant);
monitoringRouter.get("/", requireRole("GUARD", "FACULTY", "ADMIN"), getMonitoringSnapshot);
