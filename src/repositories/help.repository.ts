import type { HelpRequestStatus, HelpRequestType } from "@prisma/client";
import { prisma } from "../config/database.js";

const include = {
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
  assignedToFaculty: {
    include: {
      user: { select: { id: true, name: true } },
    },
  },
} as const;

export const helpRepository = {
  create: (data: {
    organizationId: string;
    studentId: string;
    type: HelpRequestType;
    description: string;
    priority?: string | null;
  }) => prisma.helpRequest.create({ data, include }),

  findById: (organizationId: string, id: string) =>
    prisma.helpRequest.findFirst({
      where: { id, organizationId },
      include,
    }),

  list: (args: {
    organizationId: string;
    studentId?: string;
    status?: HelpRequestStatus;
    type?: HelpRequestType;
    assignedToFacultyId?: string;
    skip: number;
    take: number;
  }) =>
    Promise.all([
      prisma.helpRequest.findMany({
        where: {
          organizationId: args.organizationId,
          studentId: args.studentId,
          status: args.status,
          type: args.type,
          assignedToFacultyId: args.assignedToFacultyId,
        },
        include,
        orderBy: { createdAt: "desc" },
        skip: args.skip,
        take: args.take,
      }),
      prisma.helpRequest.count({
        where: {
          organizationId: args.organizationId,
          studentId: args.studentId,
          status: args.status,
          type: args.type,
          assignedToFacultyId: args.assignedToFacultyId,
        },
      }),
    ]),

  update: (
    id: string,
    data: {
      status?: HelpRequestStatus;
      assignedToFacultyId?: string | null;
      resolvedAt?: Date | null;
    },
  ) => prisma.helpRequest.update({ where: { id }, data, include }),
};
