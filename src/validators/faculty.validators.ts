import { z } from "zod";

export const createFacultyBodySchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().trim().toLowerCase().email("A valid email is required"),
  employeeId: z.string().trim().min(1, "Employee ID is required"),
  department: z.string().trim().min(1).optional(),
});

export type CreateFacultyBody = z.infer<typeof createFacultyBodySchema>;

export const updateFacultyBodySchema = z.object({
  name: z.string().trim().min(1, "Name is required").optional(),
  email: z.string().trim().toLowerCase().email("A valid email is required").optional(),
  department: z.string().trim().min(1).optional(),
});

export type UpdateFacultyBody = z.infer<typeof updateFacultyBodySchema>;
