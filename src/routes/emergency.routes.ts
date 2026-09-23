import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { attachTenant } from "../middleware/tenant.middleware.js";
import { requireRole } from "../middleware/rbac.middleware.js";
import {
  acknowledgeEmergency,
  createEmergency,
  listEmergencies,
  resolveEmergency,
} from "../controllers/emergency.controller.js";

export const emergencyRouter = Router();

emergencyRouter.use(requireAuth, attachTenant);

emergencyRouter.post("/", requireRole("STUDENT"), createEmergency);
emergencyRouter.get("/", requireRole("GUARD", "FACULTY", "ADMIN"), listEmergencies);
emergencyRouter.patch(
  "/:id/acknowledge",
  requireRole("GUARD", "FACULTY", "ADMIN"),
  acknowledgeEmergency,
);
emergencyRouter.patch(
  "/:id/resolve",
  requireRole("FACULTY", "ADMIN"),
  resolveEmergency,
);
