import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { attachTenant } from "../middleware/tenant.middleware.js";
import { requireRole } from "../middleware/rbac.middleware.js";
import { getMyQR, rotateQR } from "../controllers/qr.controller.js";

export const qrRouter = Router();

qrRouter.use(requireAuth, attachTenant, requireRole("STUDENT"));

qrRouter.get("/me", getMyQR);
qrRouter.post("/rotate", rotateQR);
