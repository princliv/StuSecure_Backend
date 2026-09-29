import { Prisma } from "@prisma/client";
import { ApiError } from "../utils/ApiError.js";
import { movementRepository } from "../repositories/movement.repository.js";
import { studentRepository } from "../repositories/student.repository.js";
import { assertUnderPlanLimit } from "./plan.service.js";
import type { CreateStudentBody, UpdateStudentBody } from "../validators/student.validators.js";

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

  create: async (orgId: string, body: CreateStudentBody) => {
    const existingEmail = await studentRepository.findByEmail(orgId, body.email);
    if (existingEmail) {
      throw new ApiError(409, "A user with this email already exists in your organization");
    }
    const existingEnrollment = await studentRepository.findByEnrollmentNo(orgId, body.enrollmentNo);
    if (existingEnrollment) {
      throw new ApiError(409, "A student with this enrollment number already exists");
    }
    await assertUnderPlanLimit(orgId, "STUDENT");

    try {
      const row = await studentRepository.createWithUser({
        organizationId: orgId,
        name: body.name,
        email: body.email,
        enrollmentNo: body.enrollmentNo,
        phone: body.phone ?? null,
        roomId: body.roomId ?? null,
      });
      return serialize(row);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === "P2002") {
          throw new ApiError(409, "A student with this email or enrollment number already exists");
        }
        if (err.code === "P2003") {
          throw new ApiError(400, "Invalid roomId — no such room in your organization");
        }
      }
      throw err;
    }
  },

  update: async (orgId: string, id: string, body: UpdateStudentBody) => {
    const existing = await studentRepository.findById(orgId, id);
    if (!existing) throw new ApiError(404, "Student not found");

    if (body.email && body.email !== existing.user.email) {
      const existingEmail = await studentRepository.findByEmail(orgId, body.email);
      if (existingEmail) {
        throw new ApiError(409, "A user with this email already exists in your organization");
      }
    }

    try {
      const row = await studentRepository.updateWithUser(orgId, id, existing.userId, {
        name: body.name,
        email: body.email,
        phone: body.phone,
        roomId: body.roomId,
      });
      if (!row) throw new ApiError(404, "Student not found");
      return serialize(row);
    } catch (err) {
      if (err instanceof ApiError) throw err;
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === "P2002") {
          throw new ApiError(409, "A student with this email already exists");
        }
        if (err.code === "P2025") {
          throw new ApiError(404, "Student not found");
        }
        if (err.code === "P2003") {
          throw new ApiError(400, "Invalid roomId — no such room in your organization");
        }
      }
      throw err;
    }
  },

  remove: async (orgId: string, id: string) => {
    const existing = await studentRepository.findById(orgId, id);
    if (!existing) throw new ApiError(404, "Student not found");

    try {
      await studentRepository.remove(existing.id, existing.userId);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2003") {
        throw new ApiError(409, "Cannot delete a student with existing activity records");
      }
      throw err;
    }
  },
};
