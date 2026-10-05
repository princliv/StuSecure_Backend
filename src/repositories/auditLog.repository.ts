import { prisma } from "../config/database.js";
import type { Prisma } from "@prisma/client";

export const auditLogRepository = {
  create: (data: {
    organizationId: string;
    actorUserId: string | null;
    action: string;
    entityType: string;
    entityId: string;
    metadata?: Prisma.InputJsonValue;
  }) => prisma.auditLog.create({ data }),

  list: (args: {
    organizationId: string;
    entityType?: string;
    skip: number;
    take: number;
  }) => {
    const where = {
      organizationId: args.organizationId,
      ...(args.entityType ? { entityType: args.entityType } : {}),
    };
    return Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" as const },
        skip: args.skip,
        take: args.take,
        include: {
          actor: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);
  },
};
