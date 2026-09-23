import type { EmergencyStatus } from "@prisma/client";
import { prisma } from "../config/database.js";

const include = {
  reportedBy: {
    include: {
      user: { select: { name: true } },
      room: {
        select: {
          number: true,
          hostel: { select: { name: true } },
        },
      },
    },
  },
  resolvedBy: { select: { id: true, name: true } },
} as const;

export const emergencyRepository = {
  create: (data: {
    organizationId: string;
    reportedById: string;
    description: string;
    location?: string | null;
  }) => prisma.emergency.create({ data, include }),

  findById: (organizationId: string, id: string) =>
    prisma.emergency.findFirst({
      where: { id, organizationId },
      include,
    }),

  findActiveForStudent: (organizationId: string, studentId: string) =>
    prisma.emergency.findFirst({
      where: {
        organizationId,
        reportedById: studentId,
        status: { in: ["ACTIVE", "ACKNOWLEDGED"] },
      },
      orderBy: { createdAt: "desc" },
      include,
    }),

  list: (args: {
    organizationId: string;
    status?: EmergencyStatus;
    reportedById?: string;
    skip: number;
    take: number;
  }) =>
    Promise.all([
      prisma.emergency.findMany({
        where: {
          organizationId: args.organizationId,
          status: args.status,
          reportedById: args.reportedById,
        },
        include,
        orderBy: { createdAt: "desc" },
        skip: args.skip,
        take: args.take,
      }),
      prisma.emergency.count({
        where: {
          organizationId: args.organizationId,
          status: args.status,
          reportedById: args.reportedById,
        },
      }),
    ]),

  updateStatus: (
    id: string,
    data: {
      status: EmergencyStatus;
      resolvedByUserId?: string | null;
      resolvedAt?: Date | null;
    },
  ) => prisma.emergency.update({ where: { id }, data, include }),
};
