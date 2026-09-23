import type { MovementType } from "@prisma/client";
import { prisma } from "../config/database.js";

const movementInclude = {
  student: {
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
  guard: {
    include: {
      user: { select: { name: true } },
    },
  },
} as const;

export const movementRepository = {
  findLatestForStudent: (organizationId: string, studentId: string) =>
    prisma.movementLog.findFirst({
      where: { organizationId, studentId },
      orderBy: { createdAt: "desc" },
    }),

  create: (data: {
    organizationId: string;
    studentId: string;
    guardId: string;
    type: MovementType;
    location?: string | null;
  }) =>
    prisma.movementLog.create({
      data,
      include: movementInclude,
    }),

  list: (args: {
    organizationId: string;
    studentId?: string;
    guardId?: string;
    from?: Date;
    to?: Date;
    skip: number;
    take: number;
  }) => {
    const where = {
      organizationId: args.organizationId,
      studentId: args.studentId,
      guardId: args.guardId,
      createdAt:
        args.from || args.to
          ? {
              gte: args.from,
              lte: args.to,
            }
          : undefined,
    };
    return Promise.all([
      prisma.movementLog.findMany({
        where,
        include: movementInclude,
        orderBy: { createdAt: "desc" },
        skip: args.skip,
        take: args.take,
      }),
      prisma.movementLog.count({ where }),
    ]);
  },
};
