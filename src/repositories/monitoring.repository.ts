import { Prisma } from "@prisma/client";
import { prisma } from "../config/database.js";
import { movementRepository } from "./movement.repository.js";

export const monitoringRepository = {
  studentCount: (organizationId: string) =>
    prisma.student.count({ where: { organizationId } }),

  openEmergencyCount: (organizationId: string) =>
    prisma.emergency.count({
      where: {
        organizationId,
        status: { in: ["ACTIVE", "ACKNOWLEDGED"] },
      },
    }),

  latestOpenEmergencies: (organizationId: string, take = 5) =>
    prisma.emergency.findMany({
      where: {
        organizationId,
        status: { in: ["ACTIVE", "ACKNOWLEDGED"] },
      },
      include: {
        reportedBy: {
          include: { user: { select: { name: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
      take,
    }),

  hostels: (organizationId: string) =>
    prisma.hostel.findMany({
      where: { organizationId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),

  insideCountFromLatestLogs: async (organizationId: string) => {
    const rows = await prisma.$queryRaw<Array<{ type: string; count: number }>>(
      Prisma.sql`
        SELECT t.type, COUNT(*)::int AS count
        FROM (
          SELECT DISTINCT ON ("studentId") type
          FROM "MovementLog"
          WHERE "organizationId" = ${organizationId}
          ORDER BY "studentId", "createdAt" DESC
        ) t
        GROUP BY t.type
      `,
    );
    const inside = rows.find((r) => r.type === "CHECK_IN")?.count ?? 0;
    return Number(inside);
  },

  recentMovements: (organizationId: string, take: number) =>
    movementRepository.list({
      organizationId,
      skip: 0,
      take,
    }),
};
