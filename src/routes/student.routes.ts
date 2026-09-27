import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { attachTenant } from "../middleware/tenant.middleware.js";
import { requireRole } from "../middleware/rbac.middleware.js";
import {
  createStudent,
  deleteStudent,
  getMyStudent,
  getStudentById,
  listStudents,
  updateStudent,
} from "../controllers/student.controller.js";

export const studentRouter = Router();
studentRouter.use(requireAuth, attachTenant);
studentRouter.get("/", requireRole("FACULTY", "ADMIN", "GUARD"), listStudents);
studentRouter.post("/", requireRole("ADMIN"), createStudent);
studentRouter.get("/me", requireRole("STUDENT"), getMyStudent);
studentRouter.get("/:id", requireRole("FACULTY", "ADMIN", "GUARD"), getStudentById);
studentRouter.patch("/:id", requireRole("ADMIN"), updateStudent);
studentRouter.delete("/:id", requireRole("ADMIN"), deleteStudent);
