import type { Role } from "@prisma/client";
import { ApiError } from "../utils/ApiError.js";
import { prisma } from "../config/database.js";
import { limitsForPlan, type PlanLimits } from "../config/plans.js";

function limitKeyForRole(role: Role): keyof PlanLimits {
  switch (role) {
    case "STUDENT":
      return "maxStudents";
    case "GUARD":
      return "maxGuards";
    case "FACULTY":
      return "maxFaculty";
    case "ADMIN":
      return "maxAdmins";
  }
}

/**
 * Current membership count for a role, and the plan's limit for that role
 * (`null` = unlimited). Shared by `assertUnderPlanLimit` and the
 * `GET /orgs/:id/plan-usage` endpoint so the counting logic lives in one
 * place — see docs/StuSecure_SaaS_Plan.md Group G2.
 */
export async function getRoleUsage(
  organizationId: string,
  role: Role,
): Promise<{ current: number; limit: number | null; plan: string }> {
  const org = await prisma.organization.findUniqueOrThrow({
    where: { id: organizationId },
    select: { plan: true },
  });
  const limits = limitsForPlan(org.plan);
  const limit = limits[limitKeyForRole(role)];
  const current = await prisma.membership.count({ where: { organizationId, role } });
  return { current, limit, plan: org.plan };
}

/**
 * Throws `ApiError(403, ...)` if the org is already at/over its plan's limit
 * for `role`. Called before every `Membership` creation EXCEPT org creation
 * (an org's founding ADMIN membership is never limit-checked — every plan
 * must allow at least 1 admin).
 */
export async function assertUnderPlanLimit(organizationId: string, role: Role): Promise<void> {
  const { current, limit, plan } = await getRoleUsage(organizationId, role);
  if (limit === null) return; // unlimited on this plan

  if (current >= limit) {
    throw new ApiError(
      403,
      `Plan limit reached: this organization's ${plan} plan allows up to ${limit} ${role.toLowerCase()}(s). Upgrade to add more.`,
    );
  }
}
