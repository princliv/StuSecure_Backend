import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { attachTenant } from "../middleware/tenant.middleware.js";
import { registerDevice } from "../controllers/device.controller.js";

export const deviceRouter = Router();
deviceRouter.use(requireAuth, attachTenant);
deviceRouter.post("/", registerDevice);
