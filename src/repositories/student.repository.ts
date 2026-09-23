import { prisma } from "../config/database.js";

export const studentRepository = {
  findByUserId: (organizationId: string, userId: string) =>
    prisma.student.findFirst({
      where: { organizationId, userId },
      include: {
        user: { select: { name: true } },
        room: {
          select: {
            number: true,
            hostel: { select: { name: true } },
          },
        },
      },
    }),

  create: (data: {
    organizationId: string;
    userId: string;
    enrollmentNo: string;
    roomId?: string | null;
    phone?: string | null;
  }) =>
    prisma.student.create({
      data,
      include: {
        user: { select: { name: true } },
        room: {
          select: {
            number: true,
            hostel: { select: { name: true } },
          },
        },
      },
    }),
};
