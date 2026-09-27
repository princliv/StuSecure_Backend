import { prisma } from "../config/database.js";

const hostelListInclude = {
  _count: { select: { rooms: true, guards: true } },
} as const;

const hostelDetailInclude = {
  _count: { select: { rooms: true, guards: true } },
  rooms: {
    select: {
      id: true,
      number: true,
      capacity: true,
      _count: { select: { students: true } },
    },
    orderBy: { number: "asc" as const },
  },
} as const;

export const hostelRepository = {
  findById: (organizationId: string, id: string) =>
    prisma.hostel.findFirst({
      where: { organizationId, id },
      include: hostelDetailInclude,
    }),

  findByName: (organizationId: string, name: string) =>
    prisma.hostel.findUnique({
      where: { organizationId_name: { organizationId, name } },
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
        ? { name: { contains: search, mode: "insensitive" as const } }
        : {}),
    };
    return Promise.all([
      prisma.hostel.findMany({
        where,
        include: hostelListInclude,
        orderBy: { name: "asc" },
        skip: args.skip,
        take: args.take,
      }),
      prisma.hostel.count({ where }),
    ]);
  },

  create: (data: { organizationId: string; name: string }) =>
    prisma.hostel.create({ data, include: hostelListInclude }),

  update: (organizationId: string, id: string, data: { name?: string }) =>
    prisma.hostel.update({
      where: { id },
      data,
      include: hostelListInclude,
    }),

  remove: (id: string) => prisma.hostel.delete({ where: { id } }),
};
