import { randomUUID } from "node:crypto";
import { prisma } from "../config/database.js";

const facultyInclude = {
  user: { select: { name: true, email: true } },
} as const;

export const facultyRepository = {
  findByUserId: (organizationId: string, userId: string) =>
    prisma.faculty.findFirst({
      where: { organizationId, userId },
      include: facultyInclude,
    }),

  findById: (organizationId: string, id: string) =>
    prisma.faculty.findFirst({
      where: { organizationId, id },
      include: facultyInclude,
    }),

  list: (args: {
    organizationId: string;
    search?: string;
    skip: number;
    take: number;
  }) => {
    const search = args.search?.trim();
    const where = {
      organizationId: args.organizationId,
      ...(search
        ? {
            OR: [
              { employeeId: { contains: search, mode: "insensitive" as const } },
              { user: { name: { contains: search, mode: "insensitive" as const } } },
              { user: { email: { contains: search, mode: "insensitive" as const } } },
            ],
          }
        : {}),
    };
    return Promise.all([
      prisma.faculty.findMany({
        where,
        include: facultyInclude,
        orderBy: { employeeId: "asc" },
        skip: args.skip,
        take: args.take,
      }),
      prisma.faculty.count({ where }),
    ]);
  },

  create: (data: {
    organizationId: string;
    userId: string;
    employeeId: string;
    department?: string | null;
  }) => prisma.faculty.create({ data, include: facultyInclude }),

  // Email is globally unique on `User` (org-scoping moved to `Membership`) —
  // same convention as `guard.repository.ts`'s `findByEmail`.
  findByEmail: (_organizationId: string, email: string) =>
    prisma.user.findUnique({ where: { email } }),

  findByEmployeeId: (organizationId: string, employeeId: string) =>
    prisma.faculty.findUnique({
      where: { organizationId_employeeId: { organizationId, employeeId } },
    }),

  /**
   * Admin-provisioned faculty don't have a Firebase account yet — same
   * `pending:<uuid>` placeholder pattern as `guard.repository.ts`'s
   * `createWithUser`, reconciled to a real Firebase UID via `POST
   * /auth/claim`.
   */
  createWithUser: (data: {
    organizationId: string;
    name: string;
    email: string;
    employeeId: string;
    department?: string | null;
  }) =>
    prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          firebaseUid: `pending:${randomUUID()}`,
          name: data.name,
          email: data.email,
        },
      });
      await tx.membership.create({
        data: { userId: user.id, organizationId: data.organizationId, role: "FACULTY" },
      });
      return tx.faculty.create({
        data: {
          organizationId: data.organizationId,
          userId: user.id,
          employeeId: data.employeeId,
          department: data.department ?? null,
        },
        include: facultyInclude,
      });
    }),

  updateWithUser: (
    organizationId: string,
    id: string,
    userId: string,
    data: { name?: string; email?: string; department?: string },
  ) =>
    prisma.$transaction(async (tx) => {
      if (data.name !== undefined || data.email !== undefined) {
        await tx.user.update({
          where: { id: userId },
          data: {
            ...(data.name !== undefined ? { name: data.name } : {}),
            ...(data.email !== undefined ? { email: data.email } : {}),
          },
        });
      }
      if (data.department !== undefined) {
        await tx.faculty.update({
          where: { id },
          data: { department: data.department },
        });
      }
      return tx.faculty.findFirst({ where: { organizationId, id }, include: facultyInclude });
    }),

  remove: (id: string, userId: string) =>
    prisma.$transaction(async (tx) => {
      await tx.faculty.delete({ where: { id } });
      // Membership rows reference User with the default RESTRICT — must
      // clear them before the User row itself can be deleted.
      await tx.membership.deleteMany({ where: { userId } });
      await tx.user.delete({ where: { id: userId } });
    }),
};
