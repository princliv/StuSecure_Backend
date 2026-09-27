import { z } from "zod";

export const createHostelBodySchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
});

export type CreateHostelBody = z.infer<typeof createHostelBodySchema>;

export const updateHostelBodySchema = z.object({
  name: z.string().trim().min(1, "Name is required").optional(),
});

export type UpdateHostelBody = z.infer<typeof updateHostelBodySchema>;
