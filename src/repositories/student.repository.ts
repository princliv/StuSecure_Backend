import { randomUUID } from "node:crypto";
import { prisma } from "../config/database.js";

const studentInclude = {
  user: { select: { name: true, email: true } },
  room: {
    select: {
      number: true,
      hostel: { select: { id: true, name: true } },
    },
  },
} as const;

export const studentRepository = {
  findByUserId: (organizationId: string, userId: string) =>
    prisma.student.findFirst({
      where: { organizationId, userId },
      include: studentInclude,
    }),

  findById: (organizationId: string, id: string) =>
    prisma.student.findFirst({
      where: { organizationId, id },
      include: studentInclude,
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
              { enrollmentNo: { contains: search, mode: "insensitive" as const } },
              { phone: { contains: search, mode: "insensitive" as const } },
              { user: { name: { contains: search, mode: "insensitive" as const } } },
              { user: { email: { contains: search, mode: "insensitive" as const } } },
            ],
          }
        : {}),
    };
    return Promise.all([
      prisma.student.findMany({
        where,
        include: studentInclude,
        orderBy: { enrollmentNo: "asc" },
        skip: args.skip,
        take: args.take,
      }),
      prisma.student.count({ where }),
    ]);
  },

  create: (data: {
    organizationId: string;
    userId: string;
    enrollmentNo: string;
    roomId?: string | null;
    phone?: string | null;
  }) =>
    prisma.student.create({
      data,
      include: studentInclude,
    }),

  // Email is now globally unique on `User` (org-scoping moved to
  // `Membership`) — see docs/StuSecure_SaaS_Plan.md Group G.
  findByEmail: (_organizationId: string, email: string) =>
    prisma.user.findUnique({ where: { email } }),

  findByEnrollmentNo: (organizationId: string, enrollmentNo: string) =>
    prisma.student.findUnique({
      where: { organizationId_enrollmentNo: { organizationId, enrollmentNo } },
    }),

  /**
   * Admin-provisioned students don't have a Firebase account yet (creating
   * one is out of scope for v1 — see Group G's invite flow). `User.firebaseUid`
   * is `@unique` and non-nullable per the schema, so it can't be left empty.
   * We use a `pending:<uuid>` placeholder that can never collide with a real
   * Firebase UID; it gets reconciled to the real UID once the student signs
   * in for the first time (Group G).
   */
  createWithUser: (data: {
    organizationId: string;
    name: string;
    email: string;
    enrollmentNo: string;
    phone?: string | null;
    roomId?: string | null;
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
        data: { userId: user.id, organizationId: data.organizationId, role: "STUDENT" },
      });
      return tx.student.create({
        data: {
          organizationId: data.organizationId,
          userId: user.id,
          enrollmentNo: data.enrollmentNo,
          phone: data.phone ?? null,
          roomId: data.roomId ?? null,
        },
        include: studentInclude,
      });
    }),

  updateWithUser: (
    organizationId: string,
    id: string,
    userId: string,
    data: { name?: string; email?: string; phone?: string; roomId?: string },
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
      if (data.phone !== undefined || data.roomId !== undefined) {
        await tx.student.update({
          where: { id },
          data: {
            ...(data.phone !== undefined ? { phone: data.phone } : {}),
            ...(data.roomId !== undefined ? { roomId: data.roomId } : {}),
          },
        });
      }
      return tx.student.findFirst({ where: { organizationId, id }, include: studentInclude });
    }),

  remove: (id: string, userId: string) =>
    prisma.$transaction(async (tx) => {
      await tx.student.delete({ where: { id } });
      // Membership rows reference User with the default RESTRICT — must
      // clear them before the User row itself can be deleted.
      await tx.membership.deleteMany({ where: { userId } });
      await tx.user.delete({ where: { id: userId } });
    }),
};
