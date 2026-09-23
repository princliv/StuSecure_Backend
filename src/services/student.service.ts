import { ApiError } from "../utils/ApiError.js";
import { movementRepository } from "../repositories/movement.repository.js";
import { studentRepository } from "../repositories/student.repository.js";

type AuthUser = { id: string; role: string; organizationId: string };

function serialize(
  row: NonNullable<Awaited<ReturnType<typeof studentRepository.findById>>>,
  lastMovement?: { type: string; timestamp: string; location: string | null } | null,
) {
  return {
    id: row.id,
    userId: row.userId,
    studentId: row.enrollmentNo,
    enrollmentNo: row.enrollmentNo,
    name: row.user.name,
    email: row.user.email,
    phone: row.phone,
    hostelId: row.room?.hostel.id ?? null,
    hostelName: row.room?.hostel.name ?? null,
    roomNumber: row.room?.number ?? null,
    lastMovement: lastMovement ?? null,
  };
}

function parsePaging(query: { page?: unknown; limit?: unknown }) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  return { page, limit, skip: (page - 1) * limit, take: limit };
}

export const studentService = {
  list: async (
    orgId: string,
    query: { page?: unknown; limit?: unknown; search?: unknown },
  ) => {
    const { page, limit, skip, take } = parsePaging(query);
    const search = typeof query.search === "string" ? query.search : undefined;
    const [rows, total] = await studentRepository.list({
      organizationId: orgId,
      search,
      skip,
      take,
    });
    return { students: rows.map((row) => serialize(row)), total, page, limit };
  },

  getById: async (orgId: string, id: string) => {
    const row = await studentRepository.findById(orgId, id);
    if (!row) throw new ApiError(404, "Student not found");
    const latest = await movementRepository.findLatestForStudent(orgId, row.id);
    return serialize(
      row,
      latest
        ? {
            type: latest.type,
            timestamp: latest.createdAt.toISOString(),
            location: latest.location,
          }
        : null,
    );
  },

  me: async (user: AuthUser, orgId: string) => {
    const row = await studentRepository.findByUserId(orgId, user.id);
    if (!row) throw new ApiError(404, "Student profile not found");
    const latest = await movementRepository.findLatestForStudent(orgId, row.id);
    return serialize(
      row,
      latest
        ? {
            type: latest.type,
            timestamp: latest.createdAt.toISOString(),
            location: latest.location,
          }
        : null,
    );
  },
};
