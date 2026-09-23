import { monitoringRepository } from "../repositories/monitoring.repository.js";

function serializeMovement(
  log: Awaited<ReturnType<typeof monitoringRepository.recentMovements>>[0][number],
) {
  return {
    id: log.id,
    studentId: log.studentId,
    guardId: log.guardId,
    type: log.type,
    location: log.location,
    timestamp: log.createdAt.toISOString(),
    student: {
      name: log.student.user.name,
      enrollmentNo: log.student.enrollmentNo,
      hostelName: log.student.room?.hostel.name ?? null,
      roomNumber: log.student.room?.number ?? null,
    },
    guard: {
      name: log.guard.user.name,
    },
  };
}

export const monitoringService = {
  snapshot: async (orgId: string) => {
    const [totalStudents, inside, openEmergencies, alerts, hostels, [logs]] =
      await Promise.all([
        monitoringRepository.studentCount(orgId),
        monitoringRepository.insideCountFromLatestLogs(orgId),
        monitoringRepository.openEmergencyCount(orgId),
        monitoringRepository.latestOpenEmergencies(orgId, 5),
        monitoringRepository.hostels(orgId),
        monitoringRepository.recentMovements(orgId, 50),
      ]);

    const insideCount = Math.min(inside, totalStudents);
    const outsideCount = Math.max(0, totalStudents - insideCount);

    return {
      insideCount,
      outsideCount,
      totalStudents,
      openEmergencyCount: openEmergencies,
      alertSummary: alerts
        .map((a) => a.reportedBy.user.name)
        .filter(Boolean)
        .slice(0, 3)
        .join(", "),
      hostels,
      movements: logs.map(serializeMovement),
    };
  },
};
