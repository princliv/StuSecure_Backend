import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { getMine, switchOrg } from "../controllers/orgs.controller.js";

export const orgsRouter = Router();

orgsRouter.get("/mine", requireAuth, getMine);
orgsRouter.post("/:id/switch", requireAuth, switchOrg);
