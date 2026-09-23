import { Router } from "express";
import { healthRouter } from "./health.routes.js";
import { authRouter } from "./auth.routes.js";
import { orgsRouter } from "./orgs.routes.js";

export const apiRouter = Router();

apiRouter.use("/health", healthRouter);
apiRouter.use("/auth", authRouter);
apiRouter.use("/orgs", orgsRouter);

// Student, guard, faculty, movement, emergency, help-request and
// notification routers are added here as their phases land.
