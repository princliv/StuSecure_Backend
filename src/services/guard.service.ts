import { Prisma } from "@prisma/client";
import { ApiError } from "../utils/ApiError.js";
import { guardRepository } from "../repositories/guard.repository.js";
import { assertUnderPlanLimit } from "./plan.service.js";
import { auditLogService } from "./auditLog.service.js";
import type { CreateGuardBody, UpdateGuardBody } from "../validators/guard.validators.js";

function serialize(
  row: NonNullable<Awaited<ReturnType<typeof guardRepository.findByUserId>>>,
) {
  return {
    id: row.id,
    userId: row.userId,
    employeeId: row.employeeId,
    name: row.user.name,
    email: row.user.email,
    shift: row.shift,
    hostelId: row.hostel?.id ?? row.hostelId ?? null,
    hostelName: row.hostel?.name ?? null,
  };
}

function parsePaging(query: { page?: unknown; limit?: unknown }) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  return { page, limit, skip: (page - 1) * limit, take: limit };
}

export const guardService = {
  list: async (
    orgId: string,
    query: { page?: unknown; limit?: unknown; search?: unknown },
  ) => {
    const { page, limit, skip, take } = parsePaging(query);
    const search = typeof query.search === "string" ? query.search : undefined;
    const [rows, total] = await guardRepository.list({
      organizationId: orgId,
      search,
      skip,
      take,
    });
    return { guards: rows.map(serialize), total, page, limit };
  },

  create: async (orgId: string, body: CreateGuardBody, actorUserId: string | null) => {
    const existingEmail = await guardRepository.findByEmail(orgId, body.email);
    if (existingEmail) {
      throw new ApiError(409, "A user with this email already exists in your organization");
    }
    const existingEmployeeId = await guardRepository.findByEmployeeId(orgId, body.employeeId);
    if (existingEmployeeId) {
      throw new ApiError(409, "A guard with this employee ID already exists");
    }
    await assertUnderPlanLimit(orgId, "GUARD");

    try {
      const row = await guardRepository.createWithUser({
        organizationId: orgId,
        name: body.name,
        email: body.email,
        employeeId: body.employeeId,
        hostelId: body.hostelId ?? null,
        shift: body.shift ?? null,
      });
      await auditLogService.record({
        organizationId: orgId,
        actorUserId,
        action: "guard.create",
        entityType: "SecurityGuard",
        entityId: row.id,
        metadata: { name: row.user.name, email: row.user.email, employeeId: row.employeeId },
      });
      return serialize(row);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === "P2002") {
          throw new ApiError(409, "A guard with this email or employee ID already exists");
        }
        if (err.code === "P2003") {
          throw new ApiError(400, "Invalid hostelId — no such hostel in your organization");
        }
      }
      throw err;
    }
  },

  update: async (orgId: string, id: string, body: UpdateGuardBody, actorUserId: string | null) => {
    const existing = await guardRepository.findById(orgId, id);
    if (!existing) throw new ApiError(404, "Guard not found");

    if (body.email && body.email !== existing.user.email) {
      const existingEmail = await guardRepository.findByEmail(orgId, body.email);
      if (existingEmail) {
        throw new ApiError(409, "A user with this email already exists in your organization");
      }
    }

    try {
      const row = await guardRepository.updateWithUser(orgId, id, existing.userId, {
        name: body.name,
        email: body.email,
        hostelId: body.hostelId,
        shift: body.shift,
      });
      if (!row) throw new ApiError(404, "Guard not found");
      const changed: Record<string, unknown> = {};
      if (body.name !== undefined) changed.name = body.name;
      if (body.email !== undefined) changed.email = body.email;
      if (body.hostelId !== undefined) changed.hostelId = body.hostelId;
      if (body.shift !== undefined) changed.shift = body.shift;
      await auditLogService.record({
        organizationId: orgId,
        actorUserId,
        action: "guard.update",
        entityType: "SecurityGuard",
        entityId: row.id,
        metadata: changed,
      });
      return serialize(row);
    } catch (err) {
      if (err instanceof ApiError) throw err;
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === "P2002") {
          throw new ApiError(409, "A guard with this email already exists");
        }
        if (err.code === "P2025") {
          throw new ApiError(404, "Guard not found");
        }
        if (err.code === "P2003") {
          throw new ApiError(400, "Invalid hostelId — no such hostel in your organization");
        }
      }
      throw err;
    }
  },

  remove: async (orgId: string, id: string, actorUserId: string | null) => {
    const existing = await guardRepository.findById(orgId, id);
    if (!existing) throw new ApiError(404, "Guard not found");

    try {
      await guardRepository.remove(existing.id, existing.userId);
      await auditLogService.record({
        organizationId: orgId,
        actorUserId,
        action: "guard.delete",
        entityType: "SecurityGuard",
        entityId: existing.id,
        metadata: { email: existing.user.email, employeeId: existing.employeeId },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2003") {
        throw new ApiError(409, "Cannot delete a guard with existing activity records");
      }
      throw err;
    }
  },
};
