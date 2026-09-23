import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { attachTenant } from "../middleware/tenant.middleware.js";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../controllers/notification.controller.js";

export const notificationRouter = Router();
notificationRouter.use(requireAuth, attachTenant);
notificationRouter.get("/", listNotifications);
notificationRouter.patch("/read-all", markAllNotificationsRead);
notificationRouter.patch("/:id/read", markNotificationRead);
