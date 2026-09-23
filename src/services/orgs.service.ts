import type { Role } from "@prisma/client";
import { ApiError } from "../utils/ApiError.js";
import { organizationRepository } from "../repositories/organization.repository.js";

export interface OrgMembership {
  organizationId: string;
  organizationName: string;
  role: string;
}

/**
 * v1 — single-org per user. Returns a one-element `memberships` array built
 * from `user.organizationId` + `user.role`. Shape kept identical to the
 * future multi-org `Membership` contract so the frontend doesn't need to
 * change when Group G (real many-to-many) lands.
 */
export const orgsService = {
  mine: async (user: { organizationId: string; role: Role }) => {
    if (!user.organizationId) return { memberships: [] as OrgMembership[] };

    const org = await organizationRepository.findById(user.organizationId);
    if (!org) return { memberships: [] as OrgMembership[] };

    return {
      memberships: [
        {
          organizationId: org.id,
          organizationName: org.name,
          role: user.role as string,
        },
      ] satisfies OrgMembership[],
    };
  },

  switch: async (
    user: { organizationId: string; role: Role },
    targetId: string,
  ) => {
    // v1: a user belongs to exactly one org — any other id is a 403.
    if (targetId !== user.organizationId) {
      throw new ApiError(403, "You are not a member of that organization");
    }

    const org = await organizationRepository.findById(user.organizationId);
    if (!org) throw new ApiError(404, "Organization not found");

    return {
      memberships: [
        {
          organizationId: org.id,
          organizationName: org.name,
          role: user.role as string,
        },
      ] satisfies OrgMembership[],
    };
  },
};
