import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { attachTenant } from "../middleware/tenant.middleware.js";
import { requireRole } from "../middleware/rbac.middleware.js";
import {
  createHostel,
  deleteHostel,
  getHostel,
  listHostels,
  updateHostel,
} from "../controllers/hostel.controller.js";

export const hostelRouter = Router();
hostelRouter.use(requireAuth, attachTenant);
hostelRouter.get("/", requireRole("FACULTY", "ADMIN", "GUARD"), listHostels);
hostelRouter.get("/:id", requireRole("FACULTY", "ADMIN", "GUARD"), getHostel);
hostelRouter.post("/", requireRole("ADMIN"), createHostel);
hostelRouter.patch("/:id", requireRole("ADMIN"), updateHostel);
hostelRouter.delete("/:id", requireRole("ADMIN"), deleteHostel);
