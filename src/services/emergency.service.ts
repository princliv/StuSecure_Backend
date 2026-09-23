import { ApiError } from "../utils/ApiError.js";
import { emitOrgEmergency } from "../realtime.js";
import { emergencyRepository } from "../repositories/emergency.repository.js";
import { studentRepository } from "../repositories/student.repository.js";
import type { CreateEmergencyBody } from "../validators/emergency.validators.js";
import type { EmergencyStatus } from "@prisma/client";

type AuthUser = {
  id: string;
  role: string;
  organizationId: string;
};

function serialize(
  row: NonNullable<Awaited<ReturnType<typeof emergencyRepository.findById>>>,
) {
  return {
    id: row.id,
    status: row.status,
    description: row.description,
    location: row.location,
    createdAt: row.createdAt.toISOString(),
    resolvedAt: row.resolvedAt?.toISOString() ?? null,
    reportedBy: {
      studentId: row.reportedById,
      name: row.reportedBy.user.name,
      enrollmentNo: row.reportedBy.enrollmentNo,
      hostelName: row.reportedBy.room?.hostel.name ?? null,
      roomNumber: row.reportedBy.room?.number ?? null,
    },
    resolvedBy: row.resolvedBy
      ? { id: row.resolvedBy.id, name: row.resolvedBy.name }
      : null,
  };
}

function parsePaging(query: { page?: unknown; limit?: unknown }) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  return { page, limit, skip: (page - 1) * limit, take: limit };
}

async function requireStudent(user: AuthUser, orgId: string) {
  let student = await studentRepository.findByUserId(orgId, user.id);
  if (student) return student;
  student = await studentRepository.create({
    organizationId: orgId,
    userId: user.id,
    enrollmentNo: `STU-${user.id.slice(-8).toUpperCase()}`,
  });
  return student;
}

export const emergencyService = {
  create: async (user: AuthUser, orgId: string, body: CreateEmergencyBody) => {
    const student = await requireStudent(user, orgId);
    const existing = await emergencyRepository.findActiveForStudent(orgId, student.id);
    if (existing) {
      throw new ApiError(409, "You already have an active emergency request");
    }

    const description =
      [body.type ?? "SOS", body.description].filter(Boolean).join(" — ") || "SOS";

    const created = await emergencyRepository.create({
      organizationId: orgId,
      reportedById: student.id,
      description,
      location: body.location ?? null,
    });

    const payload = serialize(created);
    emitOrgEmergency(orgId, "emergency:created", payload);
    return payload;
  },

  list: async (
    orgId: string,
    query: { page?: unknown; limit?: unknown; status?: unknown },
  ) => {
    const { page, limit, skip, take } = parsePaging(query);
    const allowed: EmergencyStatus[] = [
      "ACTIVE",
      "ACKNOWLEDGED",
      "RESOLVED",
      "CANCELLED",
    ];
    const status =
      typeof query.status === "string" && allowed.includes(query.status as EmergencyStatus)
        ? (query.status as EmergencyStatus)
        : undefined;

    const [rows, total] = await emergencyRepository.list({
      organizationId: orgId,
      status,
      skip,
      take,
    });
    return { emergencies: rows.map(serialize), total, page, limit };
  },

  acknowledge: async (user: AuthUser, orgId: string, id: string) => {
    const row = await emergencyRepository.findById(orgId, id);
    if (!row) throw new ApiError(404, "Emergency not found");
    if (row.status !== "ACTIVE") {
      throw new ApiError(409, "Only an active emergency can be acknowledged");
    }
    const updated = await emergencyRepository.updateStatus(id, {
      status: "ACKNOWLEDGED",
    });
    const payload = serialize(updated);
    emitOrgEmergency(orgId, "emergency:updated", payload);
    return payload;
  },

  resolve: async (user: AuthUser, orgId: string, id: string) => {
    const row = await emergencyRepository.findById(orgId, id);
    if (!row) throw new ApiError(404, "Emergency not found");
    if (row.status === "RESOLVED" || row.status === "CANCELLED") {
      throw new ApiError(409, "This emergency is already closed");
    }
    const updated = await emergencyRepository.updateStatus(id, {
      status: "RESOLVED",
      resolvedByUserId: user.id,
      resolvedAt: new Date(),
    });
    const payload = serialize(updated);
    emitOrgEmergency(orgId, "emergency:updated", payload);
    return payload;
  },
};
