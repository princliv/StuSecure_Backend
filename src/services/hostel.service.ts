import { Prisma } from "@prisma/client";
import { ApiError } from "../utils/ApiError.js";
import { hostelRepository } from "../repositories/hostel.repository.js";
import { auditLogService } from "./auditLog.service.js";
import type { CreateHostelBody, UpdateHostelBody } from "../validators/hostel.validators.js";

function serializeListRow(row: {
  id: string;
  name: string;
  createdAt: Date;
  _count: { rooms: number; guards: number };
}) {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.createdAt,
    roomCount: row._count.rooms,
    guardCount: row._count.guards,
  };
}

function serializeDetail(
  row: NonNullable<Awaited<ReturnType<typeof hostelRepository.findById>>>,
) {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.createdAt,
    roomCount: row._count.rooms,
    guardCount: row._count.guards,
    rooms: row.rooms.map((room) => ({
      id: room.id,
      number: room.number,
      capacity: room.capacity,
      occupantCount: room._count.students,
    })),
  };
}

function parsePaging(query: { page?: unknown; limit?: unknown }) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  return { page, limit, skip: (page - 1) * limit, take: limit };
}

export const hostelService = {
  list: async (
    orgId: string,
    query: { page?: unknown; limit?: unknown; search?: unknown },
  ) => {
    const { page, limit, skip, take } = parsePaging(query);
    const search = typeof query.search === "string" ? query.search : undefined;
    const [rows, total] = await hostelRepository.list({
      organizationId: orgId,
      search,
      skip,
      take,
    });
    return { hostels: rows.map(serializeListRow), total, page, limit };
  },

  get: async (orgId: string, id: string) => {
    const row = await hostelRepository.findById(orgId, id);
    if (!row) throw new ApiError(404, "Hostel not found");
    return serializeDetail(row);
  },

  create: async (orgId: string, body: CreateHostelBody, actorUserId: string | null) => {
    const existing = await hostelRepository.findByName(orgId, body.name);
    if (existing) {
      throw new ApiError(409, "A hostel with this name already exists");
    }

    try {
      const row = await hostelRepository.create({
        organizationId: orgId,
        name: body.name,
      });
      await auditLogService.record({
        organizationId: orgId,
        actorUserId,
        action: "hostel.create",
        entityType: "Hostel",
        entityId: row.id,
        metadata: { name: row.name },
      });
      return serializeListRow(row);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        throw new ApiError(409, "A hostel with this name already exists");
      }
      throw err;
    }
  },

  update: async (orgId: string, id: string, body: UpdateHostelBody, actorUserId: string | null) => {
    const existing = await hostelRepository.findById(orgId, id);
    if (!existing) throw new ApiError(404, "Hostel not found");

    if (body.name && body.name !== existing.name) {
      const existingName = await hostelRepository.findByName(orgId, body.name);
      if (existingName) {
        throw new ApiError(409, "A hostel with this name already exists");
      }
    }

    try {
      const row = await hostelRepository.update(orgId, id, { name: body.name });
      await auditLogService.record({
        organizationId: orgId,
        actorUserId,
        action: "hostel.update",
        entityType: "Hostel",
        entityId: row.id,
        metadata: body.name !== undefined ? { name: body.name } : {},
      });
      return serializeListRow(row);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === "P2002") {
          throw new ApiError(409, "A hostel with this name already exists");
        }
        if (err.code === "P2025") {
          throw new ApiError(404, "Hostel not found");
        }
      }
      throw err;
    }
  },

  remove: async (orgId: string, id: string, actorUserId: string | null) => {
    const existing = await hostelRepository.findById(orgId, id);
    if (!existing) throw new ApiError(404, "Hostel not found");

    try {
      await hostelRepository.remove(id);
      await auditLogService.record({
        organizationId: orgId,
        actorUserId,
        action: "hostel.delete",
        entityType: "Hostel",
        entityId: existing.id,
        metadata: { name: existing.name },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2003") {
        throw new ApiError(409, "Cannot delete a hostel with existing rooms or guards");
      }
      throw err;
    }
  },
};
