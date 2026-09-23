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
};
