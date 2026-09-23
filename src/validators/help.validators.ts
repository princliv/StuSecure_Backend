import { z } from "zod";

export const helpRequestTypes = [
  "TRANSPORTATION",
  "MEDICAL",
  "HOSTEL",
  "SECURITY",
  "OTHER",
] as const;

export const helpRequestStatuses = [
  "PENDING",
  "IN_PROGRESS",
  "RESOLVED",
  "CANCELLED",
] as const;

export const createHelpSchema = z.object({
  type: z.enum(helpRequestTypes),
  description: z.string().trim().min(1).max(1000),
  priority: z.enum(["LOW", "NORMAL", "HIGH"]).optional(),
});

export const assignHelpSchema = z.object({
  facultyId: z.string().min(1).optional(),
});

export type CreateHelpBody = z.infer<typeof createHelpSchema>;
export type AssignHelpBody = z.infer<typeof assignHelpSchema>;
