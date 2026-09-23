import { prisma } from "../config/database.js";

export const facultyRepository = {
  findByUserId: (organizationId: string, userId: string) =>
    prisma.faculty.findFirst({
      where: { organizationId, userId },
    }),

  findById: (organizationId: string, id: string) =>
    prisma.faculty.findFirst({
      where: { organizationId, id },
    }),

  create: (data: {
    organizationId: string;
    userId: string;
    employeeId: string;
    department?: string | null;
  }) => prisma.faculty.create({ data }),
};
