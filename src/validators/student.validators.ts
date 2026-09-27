import { z } from "zod";

export const createStudentBodySchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().trim().toLowerCase().email("A valid email is required"),
  enrollmentNo: z.string().trim().min(1, "Enrollment number is required"),
  phone: z.string().trim().min(1).optional(),
  roomId: z.string().trim().min(1).optional(),
});

export type CreateStudentBody = z.infer<typeof createStudentBodySchema>;

export const updateStudentBodySchema = z.object({
  name: z.string().trim().min(1, "Name is required").optional(),
  email: z.string().trim().toLowerCase().email("A valid email is required").optional(),
  phone: z.string().trim().min(1).optional(),
  roomId: z.string().trim().min(1).optional(),
});

export type UpdateStudentBody = z.infer<typeof updateStudentBodySchema>;
