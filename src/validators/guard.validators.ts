import { z } from "zod";

export const createGuardBodySchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().trim().toLowerCase().email("A valid email is required"),
  employeeId: z.string().trim().min(1, "Employee ID is required"),
  hostelId: z.string().trim().min(1).optional(),
  shift: z.string().trim().min(1).optional(),
});

export type CreateGuardBody = z.infer<typeof createGuardBodySchema>;

export const updateGuardBodySchema = z.object({
  name: z.string().trim().min(1, "Name is required").optional(),
  email: z.string().trim().toLowerCase().email("A valid email is required").optional(),
  hostelId: z.string().trim().min(1).optional(),
  shift: z.string().trim().min(1).optional(),
});

export type UpdateGuardBody = z.infer<typeof updateGuardBodySchema>;
