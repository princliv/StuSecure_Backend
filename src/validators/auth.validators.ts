import { z } from "zod";

/**
 * Only required the first time an identity syncs (no StuSecure account
 * yet) — an existing user's sync ignores the body entirely.
 */
export const syncBodySchema = z.object({
  displayName: z.string().trim().min(1, "Display name is required").max(120),
});

export type SyncBody = z.infer<typeof syncBodySchema>;

/**
 * Body for `POST /auth/claim` — claiming an admin-pre-provisioned
 * Student/Guard/Faculty account. `organization` is the typed
 * `Organization.slug`.
 */
export const claimBodySchema = z.object({
  displayName: z.string().trim().min(1, "Display name is required").max(120),
  organization: z.string().trim().min(1, "Organization is required"),
});

export type ClaimBody = z.infer<typeof claimBodySchema>;
