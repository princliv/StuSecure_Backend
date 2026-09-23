import { Router } from "express";
import { healthRouter } from "./health.routes.js";
import { authRouter } from "./auth.routes.js";
import { orgsRouter } from "./orgs.routes.js";
import { qrRouter } from "./qr.routes.js";
import { movementRouter } from "./movement.routes.js";
import { emergencyRouter } from "./emergency.routes.js";

export const apiRouter = Router();

apiRouter.use("/health", healthRouter);
apiRouter.use("/auth", authRouter);
apiRouter.use("/orgs", orgsRouter);
apiRouter.use("/qr", qrRouter);
apiRouter.use("/movements", movementRouter);
apiRouter.use("/emergency", emergencyRouter);

// Student, guard, faculty, movement, emergency, help-request and
// notification routers are added here as their phases land.
