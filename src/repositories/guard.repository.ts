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

  list: (args: { organizationId: string; skip: number; take: number }) =>
    Promise.all([
      prisma.securityGuard.findMany({
        where: { organizationId: args.organizationId },
        include: guardInclude,
        orderBy: { employeeId: "asc" },
        skip: args.skip,
        take: args.take,
      }),
      prisma.securityGuard.count({
        where: { organizationId: args.organizationId },
      }),
    ]),

  create: (data: {
    organizationId: string;
    userId: string;
    employeeId: string;
    hostelId?: string | null;
  }) => prisma.securityGuard.create({ data, include: guardInclude }),
};
