import type { Role } from "@prisma/client";
import { prisma } from "../config/database.js";

export const platformRepository = {
  /**
   * All organizations matching `search` (by name or slug), paginated.
   * Member counts are fetched separately (batched `groupBy`) by the caller
   * to avoid N+1 queries — see `platform.service.ts`.
   */
  listOrganizations: (args: { search?: string; skip: number; take: number }) => {
    const search = args.search?.trim();
    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { slug: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {};
    return Promise.all([
      prisma.organization.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: args.skip,
        take: args.take,
      }),
      prisma.organization.count({ where }),
    ]);
  },

  /**
   * Batched membership counts by role for a set of organizations, in a
   * single query — used to build `memberCounts` for the org list without
   * an N+1 per-org query.
   */
  memberCountsByOrg: (organizationIds: string[]) =>
    prisma.membership.groupBy({
      by: ["organizationId", "role"],
      where: { organizationId: { in: organizationIds } },
      _count: true,
    }),

  findOrganizationById: (id: string) => prisma.organization.findUnique({ where: { id } }),

  updateOrganization: (id: string, data: { plan?: string; status?: string }) =>
    prisma.organization.update({ where: { id }, data }),

  usersByRole: () => prisma.membership.groupBy({ by: ["role"], _count: true }),

  organizationsByStatus: () => prisma.organization.groupBy({ by: ["status"], _count: true }),

  organizationCount: () => prisma.organization.count(),
};

export type MemberCountRow = { organizationId: string; role: Role; _count: number };
