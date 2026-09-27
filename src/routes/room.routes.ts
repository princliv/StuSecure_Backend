import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { attachTenant } from "../middleware/tenant.middleware.js";
import { requireRole } from "../middleware/rbac.middleware.js";
import {
  createRoom,
  deleteRoom,
  listRooms,
  updateRoom,
} from "../controllers/room.controller.js";

export const roomRouter = Router();
roomRouter.use(requireAuth, attachTenant);
roomRouter.get("/", requireRole("FACULTY", "ADMIN", "GUARD"), listRooms);
roomRouter.post("/", requireRole("ADMIN"), createRoom);
roomRouter.patch("/:id", requireRole("ADMIN"), updateRoom);
roomRouter.delete("/:id", requireRole("ADMIN"), deleteRoom);
