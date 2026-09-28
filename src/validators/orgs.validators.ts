import { z } from "zod";

export const createOrgSchema = z.object({
  name: z.string().trim().min(1, "Organization name is required").max(120),
});

export type CreateOrgBody = z.infer<typeof createOrgSchema>;
