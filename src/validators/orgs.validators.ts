import { z } from "zod";

export const createOrgSchema = z.object({
  name: z.string().trim().min(1, "Organization name is required").max(120),
});

export type CreateOrgBody = z.infer<typeof createOrgSchema>;

/**
 * PATCH /orgs/:id — org self-service profile update (name/branding). At
 * least one field required. See docs/StuSecure_SaaS_Plan.md Group G4.
 */
export const updateOrgProfileSchema = z
  .object({
    name: z.string().trim().min(1, "Organization name is required").max(120).optional(),
    logoUrl: z.string().trim().min(1, "Logo URL is required").max(2048).optional(),
    primaryColor: z
      .string()
      .trim()
      .regex(/^#[0-9A-Fa-f]{6}$/, "Primary color must be a hex color like #1A2B3C")
      .optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });

export type UpdateOrgProfileBody = z.infer<typeof updateOrgProfileSchema>;
