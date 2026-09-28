import { Router } from "express";
import { requireAuth, verifyFirebaseToken } from "../middleware/auth.middleware.js";
import { getMe, syncUser } from "../controllers/auth.controller.js";

export const authRouter = Router();

authRouter.post("/sync", verifyFirebaseToken, syncUser);
// No `attachTenant` here: a user with zero or multiple memberships must
// still be able to fetch their own profile (e.g. right after sync, before
// creating/joining an org) — see docs/StuSecure_SaaS_Plan.md Group G.
authRouter.get("/me", requireAuth, getMe);
