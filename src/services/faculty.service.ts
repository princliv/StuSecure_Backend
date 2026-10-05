import { Prisma } from "@prisma/client";
import { ApiError } from "../utils/ApiError.js";
import { facultyRepository } from "../repositories/faculty.repository.js";
import { assertUnderPlanLimit } from "./plan.service.js";
import { auditLogService } from "./auditLog.service.js";
import type { CreateFacultyBody, UpdateFacultyBody } from "../validators/faculty.validators.js";

function serialize(
  row: NonNullable<Awaited<ReturnType<typeof facultyRepository.findByUserId>>>,
) {
  return {
    id: row.id,
    userId: row.userId,
    employeeId: row.employeeId,
    name: row.user.name,
    email: row.user.email,
    department: row.department ?? null,
  };
}

function parsePaging(query: { page?: unknown; limit?: unknown }) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  return { page, limit, skip: (page - 1) * limit, take: limit };
}

export const facultyService = {
  list: async (
    orgId: string,
    query: { page?: unknown; limit?: unknown; search?: unknown },
  ) => {
    const { page, limit, skip, take } = parsePaging(query);
    const search = typeof query.search === "string" ? query.search : undefined;
    const [rows, total] = await facultyRepository.list({
      organizationId: orgId,
      search,
      skip,
      take,
    });
    return { faculty: rows.map(serialize), total, page, limit };
  },

  get: async (orgId: string, id: string) => {
    const row = await facultyRepository.findById(orgId, id);
    if (!row) throw new ApiError(404, "Faculty not found");
    return serialize(row);
  },

  create: async (orgId: string, body: CreateFacultyBody, actorUserId: string | null) => {
    const existingEmail = await facultyRepository.findByEmail(orgId, body.email);
    if (existingEmail) {
      throw new ApiError(409, "A user with this email already exists in your organization");
    }
    const existingEmployeeId = await facultyRepository.findByEmployeeId(orgId, body.employeeId);
    if (existingEmployeeId) {
      throw new ApiError(409, "A faculty member with this employee ID already exists");
    }
    await assertUnderPlanLimit(orgId, "FACULTY");

    try {
      const row = await facultyRepository.createWithUser({
        organizationId: orgId,
        name: body.name,
        email: body.email,
        employeeId: body.employeeId,
        department: body.department ?? null,
      });
      await auditLogService.record({
        organizationId: orgId,
        actorUserId,
        action: "faculty.create",
        entityType: "Faculty",
        entityId: row.id,
        metadata: { name: row.user.name, email: row.user.email, employeeId: row.employeeId },
      });
      return serialize(row);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === "P2002") {
          throw new ApiError(409, "A faculty member with this email or employee ID already exists");
        }
      }
      throw err;
    }
  },

  update: async (orgId: string, id: string, body: UpdateFacultyBody, actorUserId: string | null) => {
    const existing = await facultyRepository.findById(orgId, id);
    if (!existing) throw new ApiError(404, "Faculty not found");

    if (body.email && body.email !== existing.user.email) {
      const existingEmail = await facultyRepository.findByEmail(orgId, body.email);
      if (existingEmail) {
        throw new ApiError(409, "A user with this email already exists in your organization");
      }
    }

    try {
      const row = await facultyRepository.updateWithUser(orgId, id, existing.userId, {
        name: body.name,
        email: body.email,
        department: body.department,
      });
      if (!row) throw new ApiError(404, "Faculty not found");
      const changed: Record<string, unknown> = {};
      if (body.name !== undefined) changed.name = body.name;
      if (body.email !== undefined) changed.email = body.email;
      if (body.department !== undefined) changed.department = body.department;
      await auditLogService.record({
        organizationId: orgId,
        actorUserId,
        action: "faculty.update",
        entityType: "Faculty",
        entityId: row.id,
        metadata: changed,
      });
      return serialize(row);
    } catch (err) {
      if (err instanceof ApiError) throw err;
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === "P2002") {
          throw new ApiError(409, "A faculty member with this email already exists");
        }
        if (err.code === "P2025") {
          throw new ApiError(404, "Faculty not found");
        }
      }
      throw err;
    }
  },

  remove: async (orgId: string, id: string, actorUserId: string | null) => {
    const existing = await facultyRepository.findById(orgId, id);
    if (!existing) throw new ApiError(404, "Faculty not found");

    try {
      await facultyRepository.remove(existing.id, existing.userId);
      await auditLogService.record({
        organizationId: orgId,
        actorUserId,
        action: "faculty.delete",
        entityType: "Faculty",
        entityId: existing.id,
        metadata: { email: existing.user.email, employeeId: existing.employeeId },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2003") {
        throw new ApiError(409, "Cannot delete a faculty member with existing activity records");
      }
      throw err;
    }
  },
};
