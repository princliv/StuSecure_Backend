import { z } from "zod";

export const createEmergencySchema = z.object({
  description: z.string().trim().max(500).optional(),
  location: z.string().trim().max(200).optional(),
  type: z.enum(["SOS", "FIRE", "MEDICAL", "SECURITY", "OTHER"]).optional(),
});

export type CreateEmergencyBody = z.infer<typeof createEmergencySchema>;
