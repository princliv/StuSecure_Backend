import { prisma } from "../config/database.js";

export const guardRepository = {
  findByUserId: (organizationId: string, userId: string) =>
    prisma.securityGuard.findFirst({
      where: { organizationId, userId },
    }),

  create: (data: {
    organizationId: string;
    userId: string;
    employeeId: string;
    hostelId?: string | null;
  }) => prisma.securityGuard.create({ data }),
};
