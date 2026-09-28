import { randomBytes } from "node:crypto";
import { ApiError } from "../utils/ApiError.js";
import { prisma } from "../config/database.js";
import { slugify } from "../utils/slug.js";
import { serialize } from "./auth.service.js";

export interface OrgMembership {
  organizationId: string;
  organizationName: string;
  role: string;
}

type AuthUser = {
  id: string;
  memberships: OrgMembership[];
};

/**
 * `mine`/`switch` read off `user.memberships` — already loaded by
 * `requireAuth` from the real `Membership` table, no extra DB call needed.
 * See docs/StuSecure_SaaS_Plan.md Group G.
 */
export const orgsService = {
  mine: (user: AuthUser) => ({
    memberships: user.memberships satisfies OrgMembership[],
  }),

  switch: (user: AuthUser, targetId: string) => {
    const membership = user.memberships.find((m) => m.organizationId === targetId);
    if (!membership) {
      throw new ApiError(403, "You are not a member of that organization");
    }
    return { memberships: user.memberships satisfies OrgMembership[] };
  },

  /**
   * Creates a brand-new Organization and makes the caller its first ADMIN
   * member, in one transaction. `requireAuth`-only route (no `attachTenant`)
   * so a user with zero memberships can call this.
   */
  create: async (userId: string, name: string) => {
    const slug = `${slugify(name)}-${randomBytes(3).toString("hex")}`;

    const result = await prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: { name, slug },
      });
      await tx.membership.create({
        data: { userId, organizationId: organization.id, role: "ADMIN" },
      });
      return tx.user.findUniqueOrThrow({
        where: { id: userId },
        include: { memberships: { include: { organization: true } } },
      });
    });

    return serialize(result);
  },
};
