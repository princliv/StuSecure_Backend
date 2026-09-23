import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { attachTenant } from "../middleware/tenant.middleware.js";
import { requireRole } from "../middleware/rbac.middleware.js";
import {
  getMyStudent,
  getStudentById,
  listStudents,
} from "../controllers/student.controller.js";

export const studentRouter = Router();
studentRouter.use(requireAuth, attachTenant);
studentRouter.get("/", requireRole("FACULTY", "ADMIN", "GUARD"), listStudents);
studentRouter.get("/me", requireRole("STUDENT"), getMyStudent);
studentRouter.get("/:id", requireRole("FACULTY", "ADMIN", "GUARD"), getStudentById);
