import { prisma } from "../config/database.js";

export const qrRepository = {
  findActiveByStudent: (organizationId: string, studentId: string) =>
    prisma.qRIdentity.findFirst({
      where: { organizationId, studentId, isActive: true },
    }),

  findByStudent: (organizationId: string, studentId: string) =>
    prisma.qRIdentity.findFirst({
      where: { organizationId, studentId },
    }),

  findActiveByToken: (organizationId: string, token: string) =>
    prisma.qRIdentity.findFirst({
      where: { organizationId, token, isActive: true },
      include: {
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
      },
    }),

  create: (data: {
    organizationId: string;
    studentId: string;
    token: string;
  }) => prisma.qRIdentity.create({ data }),

  rotate: (id: string, token: string) =>
    prisma.qRIdentity.update({
      where: { id },
      data: { token, isActive: true, rotatedAt: new Date() },
    }),
};
