import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { attachTenant } from "../middleware/tenant.middleware.js";
import { requireRole } from "../middleware/rbac.middleware.js";
import { getMovementsCsv, getReportOverview, getReportSummary } from "../controllers/reports.controller.js";

export const reportsRouter = Router();
reportsRouter.use(requireAuth, attachTenant);
reportsRouter.get("/summary", requireRole("FACULTY", "ADMIN"), getReportSummary);
reportsRouter.get("/overview", requireRole("FACULTY", "ADMIN"), getReportOverview);
reportsRouter.get("/movements.csv", requireRole("FACULTY", "ADMIN"), getMovementsCsv);
