import { randomBytes } from "node:crypto";
import { ApiError } from "../utils/ApiError.js";
import { prisma } from "../config/database.js";
import { slugify } from "../utils/slug.js";
import { serialize } from "./auth.service.js";
import { getRoleUsage } from "./plan.service.js";
import { auditLogService } from "./auditLog.service.js";
import { auditLogRepository } from "../repositories/auditLog.repository.js";

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

  /**
   * PATCH /orgs/:id — org self-service profile update (name/logo/color).
   * ADMIN-only, own-org-only (gated by requireOwnOrgParam in the route).
   * See docs/StuSecure_SaaS_Plan.md Group G4.
   */
  updateProfile: async (
    organizationId: string,
    body: { name?: string; logoUrl?: string; primaryColor?: string },
    actorUserId: string | null,
  ) => {
    const updated = await prisma.organization.update({
      where: { id: organizationId },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.logoUrl !== undefined ? { logoUrl: body.logoUrl } : {}),
        ...(body.primaryColor !== undefined ? { primaryColor: body.primaryColor } : {}),
      },
    });

    const changed: Record<string, unknown> = {};
    if (body.name !== undefined) changed.name = body.name;
    if (body.logoUrl !== undefined) changed.logoUrl = body.logoUrl;
    if (body.primaryColor !== undefined) changed.primaryColor = body.primaryColor;
    await auditLogService.record({
      organizationId,
      actorUserId,
      action: "organization.profile_update",
      entityType: "Organization",
      entityId: organizationId,
      metadata: changed,
    });

    return {
      id: updated.id,
      name: updated.name,
      slug: updated.slug,
      logoUrl: updated.logoUrl,
      primaryColor: updated.primaryColor,
      plan: updated.plan,
      status: updated.status,
    };
  },

  /**
   * GET /orgs/:id/plan-usage — current membership counts vs the org's plan
   * limits, per role. See docs/StuSecure_SaaS_Plan.md Group G2.
   */
  planUsage: async (organizationId: string) => {
    const [students, guards, faculty, admins] = await Promise.all([
      getRoleUsage(organizationId, "STUDENT"),
      getRoleUsage(organizationId, "GUARD"),
      getRoleUsage(organizationId, "FACULTY"),
      getRoleUsage(organizationId, "ADMIN"),
    ]);
    return {
      plan: students.plan,
      usage: {
        students: { current: students.current, limit: students.limit },
        guards: { current: guards.current, limit: guards.limit },
        faculty: { current: faculty.current, limit: faculty.limit },
        admins: { current: admins.current, limit: admins.limit },
      },
    };
  },

  /**
   * GET /orgs/:id/audit-logs — administrative/structural mutation history
   * for the org (people, places, invites, org settings). See
   * docs/StuSecure_SaaS_Plan.md §8 "Audit log includes org + actor".
   */
  auditLogs: async (
    organizationId: string,
    query: { page?: unknown; limit?: unknown; entityType?: unknown },
  ) => {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const entityType = typeof query.entityType === "string" ? query.entityType : undefined;

    const [rows, total] = await auditLogRepository.list({
      organizationId,
      entityType,
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      auditLogs: rows.map((row) => ({
        id: row.id,
        action: row.action,
        entityType: row.entityType,
        entityId: row.entityId,
        metadata: row.metadata,
        createdAt: row.createdAt.toISOString(),
        actor: row.actor
          ? { id: row.actor.id, name: row.actor.name, email: row.actor.email }
          : null,
      })),
      total,
      page,
      limit,
    };
  },
};
