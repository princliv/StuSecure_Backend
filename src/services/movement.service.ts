import { ApiError } from "../utils/ApiError.js";
import { emitOrgMovement } from "../realtime.js";
import { notificationService } from "./notification.service.js";
import { guardRepository } from "../repositories/guard.repository.js";
import { movementRepository } from "../repositories/movement.repository.js";
import { qrRepository } from "../repositories/qr.repository.js";
import { studentRepository } from "../repositories/student.repository.js";
import type { ScanBody } from "../validators/movement.validators.js";

type AuthUser = {
  id: string;
  role: string;
  organizationId: string;
};

const SCAN_COOLDOWN_MS = 10_000;

function serialize(
  log: Awaited<ReturnType<typeof movementRepository.create>>,
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

async function requireGuard(user: AuthUser, orgId: string) {
  let guard = await guardRepository.findByUserId(orgId, user.id);
  if (guard) return guard;

  guard = await guardRepository.create({
    organizationId: orgId,
    userId: user.id,
    employeeId: `GRD-${user.id.slice(-8).toUpperCase()}`,
  });
  return guard;
}

function parsePaging(query: { page?: unknown; limit?: unknown }) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  return { page, limit, skip: (page - 1) * limit, take: limit };
}

export const movementService = {
  scan: async (user: AuthUser, orgId: string, body: ScanBody) => {
    const identity = await qrRepository.findActiveByToken(orgId, body.qrToken);
    if (!identity) {
      throw new ApiError(404, "QR token is invalid, expired, or not in this organization");
    }

    const guard = await requireGuard(user, orgId);
    const latest = await movementRepository.findLatestForStudent(
      orgId,
      identity.studentId,
    );

    if (latest && Date.now() - latest.createdAt.getTime() < SCAN_COOLDOWN_MS) {
      throw new ApiError(409, "This pass was scanned moments ago — wait and try again");
    }

    const nextType = latest?.type === "CHECK_IN" ? "CHECK_OUT" : "CHECK_IN";
    const log = await movementRepository.create({
      organizationId: orgId,
      studentId: identity.studentId,
      guardId: guard.id,
      type: nextType,
      location: body.location ?? null,
    });

    const payload = serialize(log);
    emitOrgMovement(orgId, payload);
    const label = nextType === "CHECK_IN" ? "checked in" : "checked out";
    void notificationService.notify({
      organizationId: orgId,
      userIds: [identity.student.userId],
      title: nextType === "CHECK_IN" ? "Checked in" : "Checked out",
      body: `You ${label}${payload.location ? ` at ${payload.location}` : ""}.`,
      type: nextType,
    });
    return payload;
  },

  me: async (user: AuthUser, orgId: string, query: { page?: unknown; limit?: unknown }) => {
    const { page, limit, skip, take } = parsePaging(query);

    if (user.role === "STUDENT") {
      const student = await studentRepository.findByUserId(orgId, user.id);
      if (!student) {
        return { logs: [], total: 0, page, limit };
      }
      const [rows, total] = await movementRepository.list({
        organizationId: orgId,
        studentId: student.id,
        skip,
        take,
      });
      return { logs: rows.map(serialize), total, page, limit };
    }

    if (user.role === "GUARD") {
      const guard = await guardRepository.findByUserId(orgId, user.id);
      if (!guard) {
        return { logs: [], total: 0, page, limit };
      }
      const [rows, total] = await movementRepository.list({
        organizationId: orgId,
        guardId: guard.id,
        skip,
        take,
      });
      return { logs: rows.map(serialize), total, page, limit };
    }

    throw new ApiError(403, "This endpoint is for students and guards");
  },

  list: async (
    orgId: string,
    query: { page?: unknown; limit?: unknown; studentId?: unknown; from?: unknown; to?: unknown },
  ) => {
    const { page, limit, skip, take } = parsePaging(query);
    const studentId =
      typeof query.studentId === "string" && query.studentId.length > 0
        ? query.studentId
        : undefined;
    const from =
      typeof query.from === "string" && !Number.isNaN(Date.parse(query.from))
        ? new Date(query.from)
        : undefined;
    const to =
      typeof query.to === "string" && !Number.isNaN(Date.parse(query.to))
        ? new Date(query.to)
        : undefined;

    const [rows, total] = await movementRepository.list({
      organizationId: orgId,
      studentId,
      from,
      to,
      skip,
      take,
    });
    return { logs: rows.map(serialize), total, page, limit };
  },
};
