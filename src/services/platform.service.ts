import type { Role } from "@prisma/client";
import { ApiError } from "../utils/ApiError.js";
import { orgsService } from "./orgs.service.js";
import { platformRepository } from "../repositories/platform.repository.js";
import type { UpdateOrganizationBody } from "../validators/platform.validators.js";

function parsePaging(query: { page?: unknown; limit?: unknown }) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  return { page, limit, skip: (page - 1) * limit, take: limit };
}

const ROLE_TO_KEY: Record<Role, "students" | "guards" | "faculty" | "admins"> = {
  STUDENT: "students",
  GUARD: "guards",
  FACULTY: "faculty",
  ADMIN: "admins",
};

export const platformService = {
  /**
   * GET /platform/organizations — every org on the platform, with batched
   * membership counts per role (no N+1 query per org). See
   * docs/StuSecure_SaaS_Plan.md Group G3.
   */
  listOrganizations: async (query: { search?: unknown; page?: unknown; limit?: unknown }) => {
    const { page, limit, skip, take } = parsePaging(query);
    const search = typeof query.search === "string" ? query.search : undefined;

    const [orgs, total] = await platformRepository.listOrganizations({ search, skip, take });
    const orgIds = orgs.map((o) => o.id);
    const counts = orgIds.length > 0 ? await platformRepository.memberCountsByOrg(orgIds) : [];

    const countsByOrg = new Map<string, { students: number; guards: number; faculty: number; admins: number }>();
    for (const org of orgs) {
      countsByOrg.set(org.id, { students: 0, guards: 0, faculty: 0, admins: 0 });
    }
    for (const row of counts) {
      const bucket = countsByOrg.get(row.organizationId);
      if (!bucket) continue;
      bucket[ROLE_TO_KEY[row.role]] = row._count as unknown as number;
    }

    return {
      organizations: orgs.map((org) => ({
        id: org.id,
        name: org.name,
        slug: org.slug,
        plan: org.plan,
        status: org.status,
        createdAt: org.createdAt,
        memberCounts: countsByOrg.get(org.id)!,
      })),
      total,
      page,
      limit,
    };
  },

  /**
   * GET /platform/organizations/:id — reuses `orgsService.planUsage`
   * directly (it already takes an arbitrary organizationId) plus basic org
   * fields.
   */
  getOrganization: async (id: string) => {
    const org = await platformRepository.findOrganizationById(id);
    if (!org) throw new ApiError(404, "Organization not found");

    const usage = await orgsService.planUsage(id);

    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      plan: org.plan,
      status: org.status,
      createdAt: org.createdAt,
      usage: usage.usage,
    };
  },

  /**
   * PATCH /platform/organizations/:id — the only place that ever writes
   * `Organization.plan`/`.status`.
   */
  updateOrganization: async (id: string, body: UpdateOrganizationBody) => {
    const existing = await platformRepository.findOrganizationById(id);
    if (!existing) throw new ApiError(404, "Organization not found");

    const updated = await platformRepository.updateOrganization(id, {
      plan: body.plan,
      status: body.status,
    });

    return {
      id: updated.id,
      name: updated.name,
      slug: updated.slug,
      plan: updated.plan,
      status: updated.status,
      createdAt: updated.createdAt,
    };
  },

  /** GET /platform/stats — platform-wide aggregate overview. */
  stats: async () => {
    const [totalOrganizations, usersByRoleRows, organizationsByStatusRows] = await Promise.all([
      platformRepository.organizationCount(),
      platformRepository.usersByRole(),
      platformRepository.organizationsByStatus(),
    ]);

    const usersByRole: Record<string, number> = { STUDENT: 0, GUARD: 0, FACULTY: 0, ADMIN: 0 };
    for (const row of usersByRoleRows) {
      usersByRole[row.role] = row._count as unknown as number;
    }

    const organizationsByStatus: Record<string, number> = { ACTIVE: 0, SUSPENDED: 0 };
    for (const row of organizationsByStatusRows) {
      organizationsByStatus[row.status] = row._count as unknown as number;
    }

    return { totalOrganizations, usersByRole, organizationsByStatus };
  },
};
