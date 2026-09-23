import { Prisma } from "@prisma/client";
import { prisma } from "../config/database.js";
import { monitoringRepository } from "./monitoring.repository.js";

export const reportsRepository = {
  movementCounts: async (organizationId: string, from: Date, to: Date) => {
    const grouped = await prisma.movementLog.groupBy({
      by: ["type"],
      where: { organizationId, createdAt: { gte: from, lte: to } },
      _count: { _all: true },
    });
    const uniqueStudents = await prisma.movementLog.findMany({
      where: { organizationId, createdAt: { gte: from, lte: to } },
      distinct: ["studentId"],
      select: { studentId: true },
    });
    return {
      checkIns: grouped.find((g) => g.type === "CHECK_IN")?._count._all ?? 0,
      checkOuts: grouped.find((g) => g.type === "CHECK_OUT")?._count._all ?? 0,
      uniqueStudents: uniqueStudents.length,
    };
  },

  byDay: (organizationId: string, from: Date, to: Date) =>
    prisma.$queryRaw<Array<{ day: Date; type: string; count: number }>>(
      Prisma.sql`
        SELECT date_trunc('day', "createdAt")::date AS day,
               type,
               COUNT(*)::int AS count
        FROM "MovementLog"
        WHERE "organizationId" = ${organizationId}
          AND "createdAt" >= ${from}
          AND "createdAt" <= ${to}
        GROUP BY 1, 2
        ORDER BY 1 DESC
      `,
    ),

  studentCount: (organizationId: string) =>
    monitoringRepository.studentCount(organizationId),

  insideCount: (organizationId: string) =>
    monitoringRepository.insideCountFromLatestLogs(organizationId),
};
