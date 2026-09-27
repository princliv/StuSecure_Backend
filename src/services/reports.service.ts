import { reportsRepository } from "../repositories/reports.repository.js";
import { rowsToCsv } from "../utils/csv.js";

function parseRange(query: { from?: unknown; to?: unknown }) {
  const to =
    typeof query.to === "string" && !Number.isNaN(Date.parse(query.to))
      ? new Date(query.to)
      : new Date();
  const from =
    typeof query.from === "string" && !Number.isNaN(Date.parse(query.from))
      ? new Date(query.from)
      : new Date(to.getTime() - 7 * 24 * 60 * 60 * 1000);
  return { from, to };
}

export const reportsService = {
  summary: async (orgId: string, query: { from?: unknown; to?: unknown }) => {
    const { from, to } = parseRange(query);
    const [counts, days, totalStudents, inside] = await Promise.all([
      reportsRepository.movementCounts(orgId, from, to),
      reportsRepository.byDay(orgId, from, to),
      reportsRepository.studentCount(orgId),
      reportsRepository.insideCount(orgId),
    ]);
    const insideCount = Math.min(inside, totalStudents);
    const byDayMap = new Map<string, { date: string; checkIns: number; checkOuts: number }>();
    for (const row of days) {
      const date = new Date(row.day).toISOString().slice(0, 10);
      const current = byDayMap.get(date) ?? { date, checkIns: 0, checkOuts: 0 };
      if (row.type === "CHECK_IN") current.checkIns = Number(row.count);
      if (row.type === "CHECK_OUT") current.checkOuts = Number(row.count);
      byDayMap.set(date, current);
    }

    return {
      from: from.toISOString(),
      to: to.toISOString(),
      checkIns: counts.checkIns,
      checkOuts: counts.checkOuts,
      uniqueStudents: counts.uniqueStudents,
      totalStudents,
      insideCount,
      outsideCount: Math.max(0, totalStudents - insideCount),
      byDay: [...byDayMap.values()],
    };
  },

  movementsCsv: async (orgId: string, query: { from?: unknown; to?: unknown }) => {
    const { from, to } = parseRange(query);
    const logs = await reportsRepository.movementsForExport(orgId, from, to);

    const header = ["Date", "Time", "Student Name", "Enrollment No", "Type", "Hostel", "Room", "Guard Name"];
    const rows = logs.map((log) => {
      const createdAt = log.createdAt;
      return [
        createdAt.toISOString().slice(0, 10),
        createdAt.toISOString().slice(11, 19),
        log.student.user.name,
        log.student.enrollmentNo,
        log.type === "CHECK_IN" ? "Check-in" : "Check-out",
        log.student.room?.hostel.name ?? "",
        log.student.room?.number ?? "",
        log.guard.user.name,
      ];
    });

    return {
      csv: rowsToCsv(header, rows),
      from: from.toISOString().slice(0, 10),
      to: to.toISOString().slice(0, 10),
    };
  },

  overview: async (orgId: string) => {
    const data = await reportsRepository.overview(orgId);
    const insideCount = Math.min(data.insideCount, data.totalStudents);
    const outsideCount = Math.max(0, data.totalStudents - insideCount);

    return {
      totalStudents: data.totalStudents,
      totalGuards: data.totalGuards,
      totalHostels: data.totalHostels,
      insideCount,
      outsideCount,
      openEmergencyCount: data.openEmergencyCount,
      pendingHelpCount: data.pendingHelpCount,
      todayCheckIns: data.todayCheckIns,
      todayCheckOuts: data.todayCheckOuts,
      recentMovements: data.recentMovements.map((log) => ({
        id: log.id,
        type: log.type,
        timestamp: log.createdAt.toISOString(),
        studentName: log.student.user.name,
        hostelName: log.student.room?.hostel.name ?? null,
      })),
    };
  },
};
