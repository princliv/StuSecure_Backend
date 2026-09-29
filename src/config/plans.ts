/**
 * Hardcoded plan -> limits table. `Organization.plan` is a free-form string
 * (deliberately not a Prisma enum — see docs/StuSecure_SaaS_Plan.md Group G2)
 * so it can absorb real Stripe price IDs / plan names later (G5, billing
 * integration, not yet built). This table is the placeholder source of
 * truth for enforcement until then.
 */
export interface PlanLimits {
  maxStudents: number | null; // null = unlimited
  maxGuards: number | null;
  maxFaculty: number | null;
  maxAdmins: number | null;
}

export const PLAN_LIMITS: Record<string, PlanLimits> = {
  FREE: { maxStudents: 50, maxGuards: 10, maxFaculty: 10, maxAdmins: 3 },
  PRO: { maxStudents: 500, maxGuards: 50, maxFaculty: 50, maxAdmins: 10 },
  ENTERPRISE: { maxStudents: null, maxGuards: null, maxFaculty: null, maxAdmins: null },
};

/** Unknown/future plan strings fall back to FREE's limits, not unlimited. */
export function limitsForPlan(plan: string): PlanLimits {
  return PLAN_LIMITS[plan] ?? PLAN_LIMITS.FREE;
}
