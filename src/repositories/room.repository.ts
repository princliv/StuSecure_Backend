import { prisma } from "../config/database.js";

const roomInclude = {
  hostel: { select: { id: true, name: true } },
  _count: { select: { students: true } },
} as const;

export const roomRepository = {
  findById: (organizationId: string, id: string) =>
    prisma.room.findFirst({
      where: { organizationId, id },
      include: roomInclude,
    }),

  findByNumber: (hostelId: string, number: string) =>
    prisma.room.findUnique({
      where: { hostelId_number: { hostelId, number } },
    }),

  list: (args: {
    organizationId: string;
    hostelId?: string;
    search?: string;
    skip: number;
    take: number;
  }) => {
    const search = args.search?.trim();
    const where = {
      organizationId: args.organizationId,
      ...(args.hostelId ? { hostelId: args.hostelId } : {}),
      ...(search
        ? { number: { contains: search, mode: "insensitive" as const } }
        : {}),
    };
    return Promise.all([
      prisma.room.findMany({
        where,
        include: roomInclude,
        orderBy: { number: "asc" },
        skip: args.skip,
        take: args.take,
      }),
      prisma.room.count({ where }),
    ]);
  },

  create: (data: {
    organizationId: string;
    hostelId: string;
    number: string;
    capacity?: number | null;
  }) => prisma.room.create({ data, include: roomInclude }),

  update: (
    id: string,
    data: { number?: string; capacity?: number | null },
  ) => prisma.room.update({ where: { id }, data, include: roomInclude }),

  remove: (id: string) => prisma.room.delete({ where: { id } }),
};
