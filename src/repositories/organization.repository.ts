import { prisma } from "../config/database.js";
import { slugify } from "../utils/slug.js";

const DEFAULT_ORG_SLUG = "demo";
const DEFAULT_ORG_NAME = "Demo Organization";

export const organizationRepository = {
  findBySlug: (slug: string) =>
    prisma.organization.findUnique({ where: { slug: slugify(slug) } }),

  findById: (id: string) => prisma.organization.findUnique({ where: { id } }),

  create: (data: { name: string; slug: string }) =>
    prisma.organization.create({
      data: { name: data.name, slug: slugify(data.slug) },
    }),

  /**
   * v1 placeholder: until org creation / invites exist (SaaS_Plan.md
   * Group F/G), every self-registered user joins one shared demo org.
   */
  getOrCreateDefault: async () => {
    const existing = await prisma.organization.findUnique({
      where: { slug: DEFAULT_ORG_SLUG },
    });
    if (existing) return existing;

    return prisma.organization.create({
      data: { name: DEFAULT_ORG_NAME, slug: DEFAULT_ORG_SLUG },
    });
  },
};
