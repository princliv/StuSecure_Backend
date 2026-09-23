import { Router } from "express";
import { requireAuth, verifyFirebaseToken } from "../middleware/auth.middleware.js";
import { attachTenant } from "../middleware/tenant.middleware.js";
import { getMe, syncUser } from "../controllers/auth.controller.js";

export const authRouter = Router();

authRouter.post("/sync", verifyFirebaseToken, syncUser);
authRouter.get("/me", requireAuth, attachTenant, getMe);
