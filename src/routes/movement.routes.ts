import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { attachTenant } from "../middleware/tenant.middleware.js";
import { requireRole } from "../middleware/rbac.middleware.js";
import {
  getMyMovements,
  listMovements,
  scanMovement,
} from "../controllers/movement.controller.js";

export const movementRouter = Router();

movementRouter.use(requireAuth, attachTenant);

movementRouter.post("/scan", requireRole("GUARD"), scanMovement);
movementRouter.get("/me", requireRole("STUDENT", "GUARD"), getMyMovements);
movementRouter.get("/", requireRole("GUARD", "FACULTY", "ADMIN"), listMovements);
