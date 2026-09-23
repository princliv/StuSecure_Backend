import { z } from "zod";

/**
 * Only required the first time an identity syncs (no StuSecure account
 * yet) — an existing user's sync ignores the body entirely.
 */
export const syncBodySchema = z.object({
  displayName: z.string().trim().min(1, "Display name is required").max(120),
  role: z.enum(["STUDENT", "GUARD", "FACULTY", "ADMIN"]),
});

export type SyncBody = z.infer<typeof syncBodySchema>;
