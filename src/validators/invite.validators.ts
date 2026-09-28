import { z } from "zod";

/** Mirrors the `Role` enum (`@prisma/client`) — kept as a literal Zod enum
 * (consistent with the rest of this codebase's validators, none of which use
 * `z.nativeEnum`) rather than importing the Prisma-generated enum. */
export const roleSchema = z.enum(["STUDENT", "GUARD", "FACULTY", "ADMIN"]);

export const createInviteBodySchema = z.object({
  email: z.string().trim().toLowerCase().email("A valid email is required"),
  role: roleSchema,
});
export type CreateInviteBody = z.infer<typeof createInviteBodySchema>;

export const listInvitesQuerySchema = z.object({
  status: z.enum(["PENDING", "ACCEPTED", "REVOKED", "EXPIRED"]).optional(),
  page: z.unknown().optional(),
  limit: z.unknown().optional(),
});
export type ListInvitesQuery = z.infer<typeof listInvitesQuerySchema>;

export const importInvitesBodySchema = z.object({
  csv: z.string().min(1, "CSV content is required"),
});
export type ImportInvitesBody = z.infer<typeof importInvitesBodySchema>;
