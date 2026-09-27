import { Prisma } from "@prisma/client";
import { prisma } from "../config/database.js";
import { monitoringRepository } from "./monitoring.repository.js";
import { movementRepository } from "./movement.repository.js";

// Hard cap on the number of rows a single CSV export can contain, to avoid
// unbounded memory use for very large date ranges. If a range has more
// movements than this, the export is silently truncated to the most recent
// EXPORT_ROW_LIMIT rows.
export const EXPORT_ROW_LIMIT = 10_000;

const recentMovementInclude = {
  student: {
    include: {
      user: { select: { name: true } },
      room: {
        select: {
          hostel: { select: { name: true } },
        },
      },
    },
  },
} as const;

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

  movementsForExport: async (organizationId: string, from: Date, to: Date) => {
    const [rows] = await movementRepository.list({
      organizationId,
      from,
      to,
      skip: 0,
      take: EXPORT_ROW_LIMIT,
    });
    return rows;
  },

  overview: async (organizationId: string) => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      totalStudents,
      totalGuards,
      totalHostels,
      insideCount,
      openEmergencyCount,
      pendingHelpCount,
      todayCheckIns,
      todayCheckOuts,
      recentMovements,
    ] = await Promise.all([
      prisma.student.count({ where: { organizationId } }),
      prisma.securityGuard.count({ where: { organizationId } }),
      prisma.hostel.count({ where: { organizationId } }),
      monitoringRepository.insideCountFromLatestLogs(organizationId),
      prisma.emergency.count({
        where: { organizationId, status: { in: ["ACTIVE", "ACKNOWLEDGED"] } },
      }),
      prisma.helpRequest.count({
        where: { organizationId, status: "PENDING" },
      }),
      prisma.movementLog.count({
        where: { organizationId, type: "CHECK_IN", createdAt: { gte: todayStart } },
      }),
      prisma.movementLog.count({
        where: { organizationId, type: "CHECK_OUT", createdAt: { gte: todayStart } },
      }),
      prisma.movementLog.findMany({
        where: { organizationId },
        include: recentMovementInclude,
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

    return {
      totalStudents,
      totalGuards,
      totalHostels,
      insideCount,
      openEmergencyCount,
      pendingHelpCount,
      todayCheckIns,
      todayCheckOuts,
      recentMovements,
    };
  },
};
