import { Router } from "express";
import { healthRouter } from "./health.routes.js";

export const apiRouter = Router();

apiRouter.use("/health", healthRouter);

// Student, guard, faculty, movement, emergency, help-request and
// notification routers are added here as their phases land.
