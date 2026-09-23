import { reportsRepository } from "../repositories/reports.repository.js";

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
};
