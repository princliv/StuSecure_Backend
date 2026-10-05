import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { attachTenant } from "../middleware/tenant.middleware.js";
import { requireRole } from "../middleware/rbac.middleware.js";
import {
  createFaculty,
  deleteFaculty,
  getFaculty,
  listFaculty,
  updateFaculty,
} from "../controllers/faculty.controller.js";

export const facultyRouter = Router();
facultyRouter.use(requireAuth, attachTenant);
facultyRouter.get("/", requireRole("FACULTY", "ADMIN"), listFaculty);
facultyRouter.get("/:id", requireRole("FACULTY", "ADMIN"), getFaculty);
facultyRouter.post("/", requireRole("ADMIN"), createFaculty);
facultyRouter.patch("/:id", requireRole("ADMIN"), updateFaculty);
facultyRouter.delete("/:id", requireRole("ADMIN"), deleteFaculty);
