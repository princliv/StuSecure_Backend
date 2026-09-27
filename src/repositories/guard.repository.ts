import { randomUUID } from "node:crypto";
import { prisma } from "../config/database.js";

const guardInclude = {
  user: { select: { name: true, email: true } },
  hostel: { select: { id: true, name: true } },
} as const;

export const guardRepository = {
  findByUserId: (organizationId: string, userId: string) =>
    prisma.securityGuard.findFirst({
      where: { organizationId, userId },
      include: guardInclude,
    }),

  findById: (organizationId: string, id: string) =>
    prisma.securityGuard.findFirst({
      where: { organizationId, id },
      include: guardInclude,
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
      prisma.securityGuard.findMany({
        where,
        include: guardInclude,
        orderBy: { employeeId: "asc" },
        skip: args.skip,
        take: args.take,
      }),
      prisma.securityGuard.count({ where }),
    ]);
  },

  create: (data: {
    organizationId: string;
    userId: string;
    employeeId: string;
    hostelId?: string | null;
  }) => prisma.securityGuard.create({ data, include: guardInclude }),

  findByEmail: (organizationId: string, email: string) =>
    prisma.user.findUnique({
      where: { organizationId_email: { organizationId, email } },
    }),

  findByEmployeeId: (organizationId: string, employeeId: string) =>
    prisma.securityGuard.findUnique({
      where: { organizationId_employeeId: { organizationId, employeeId } },
    }),

  /**
   * Admin-provisioned guards don't have a Firebase account yet (creating one
   * is out of scope for v1 — see Group G's invite flow). `User.firebaseUid`
   * is `@unique` and non-nullable per the schema, so it can't be left empty.
   * We use a `pending:<uuid>` placeholder that can never collide with a real
   * Firebase UID; it gets reconciled to the real UID once the guard signs in
   * for the first time (Group G).
   */
  createWithUser: (data: {
    organizationId: string;
    name: string;
    email: string;
    employeeId: string;
    hostelId?: string | null;
    shift?: string | null;
  }) =>
    prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          organizationId: data.organizationId,
          firebaseUid: `pending:${randomUUID()}`,
          name: data.name,
          email: data.email,
          role: "GUARD",
        },
      });
      return tx.securityGuard.create({
        data: {
          organizationId: data.organizationId,
          userId: user.id,
          employeeId: data.employeeId,
          hostelId: data.hostelId ?? null,
          shift: data.shift ?? null,
        },
        include: guardInclude,
      });
    }),

  updateWithUser: (
    organizationId: string,
    id: string,
    userId: string,
    data: { name?: string; email?: string; hostelId?: string; shift?: string },
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
      if (data.hostelId !== undefined || data.shift !== undefined) {
        await tx.securityGuard.update({
          where: { id },
          data: {
            ...(data.hostelId !== undefined ? { hostelId: data.hostelId } : {}),
            ...(data.shift !== undefined ? { shift: data.shift } : {}),
          },
        });
      }
      return tx.securityGuard.findFirst({ where: { organizationId, id }, include: guardInclude });
    }),

  remove: (id: string, userId: string) =>
    prisma.$transaction(async (tx) => {
      await tx.securityGuard.delete({ where: { id } });
      await tx.user.delete({ where: { id: userId } });
    }),
};
