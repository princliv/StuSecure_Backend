import type { Role } from "@prisma/client";
import { prisma } from "../config/database.js";

export const userRepository = {
  findByFirebaseUid: (firebaseUid: string) =>
    prisma.user.findUnique({
      where: { firebaseUid },
      include: { memberships: { include: { organization: true } } },
    }),

  create: (data: { firebaseUid: string; name: string; email: string }) =>
    prisma.user.create({
      data,
      include: { memberships: { include: { organization: true } } },
    }),

  /**
   * Ids of every user holding one of `roles` within `organizationId`.
   * Queries `Membership` now (role/organizationId no longer live on `User`
   * directly) but keeps the `{ id: string }[]` return shape so callers
   * (e.g. `notification.service.ts`'s `notifyRoles`) don't need to change.
   */
  findIdsByRoles: async (organizationId: string, roles: Role[]) => {
    const memberships = await prisma.membership.findMany({
      where: { organizationId, role: { in: roles } },
      select: { userId: true },
    });
    return memberships.map((m) => ({ id: m.userId }));
  },
};
