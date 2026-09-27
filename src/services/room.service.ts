import { Prisma } from "@prisma/client";
import { ApiError } from "../utils/ApiError.js";
import { roomRepository } from "../repositories/room.repository.js";
import { hostelRepository } from "../repositories/hostel.repository.js";
import type { CreateRoomBody, UpdateRoomBody } from "../validators/room.validators.js";

function serialize(
  row: NonNullable<Awaited<ReturnType<typeof roomRepository.findById>>>,
) {
  return {
    id: row.id,
    number: row.number,
    capacity: row.capacity,
    hostelId: row.hostel.id,
    hostelName: row.hostel.name,
    occupantCount: row._count.students,
  };
}

function parsePaging(query: { page?: unknown; limit?: unknown }) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  return { page, limit, skip: (page - 1) * limit, take: limit };
}

export const roomService = {
  list: async (
    orgId: string,
    query: { page?: unknown; limit?: unknown; search?: unknown; hostelId?: unknown },
  ) => {
    const { page, limit, skip, take } = parsePaging(query);
    const search = typeof query.search === "string" ? query.search : undefined;
    const hostelId = typeof query.hostelId === "string" ? query.hostelId : undefined;
    const [rows, total] = await roomRepository.list({
      organizationId: orgId,
      hostelId,
      search,
      skip,
      take,
    });
    return { rooms: rows.map(serialize), total, page, limit };
  },

  create: async (orgId: string, body: CreateRoomBody) => {
    const hostel = await hostelRepository.findById(orgId, body.hostelId);
    if (!hostel) throw new ApiError(404, "Hostel not found");

    const existing = await roomRepository.findByNumber(body.hostelId, body.number);
    if (existing) {
      throw new ApiError(409, "A room with this number already exists in this hostel");
    }

    try {
      const row = await roomRepository.create({
        organizationId: orgId,
        hostelId: body.hostelId,
        number: body.number,
        capacity: body.capacity ?? null,
      });
      return serialize(row);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === "P2002") {
          throw new ApiError(409, "A room with this number already exists in this hostel");
        }
        if (err.code === "P2003") {
          throw new ApiError(404, "Hostel not found");
        }
      }
      throw err;
    }
  },

  update: async (orgId: string, id: string, body: UpdateRoomBody) => {
    const existing = await roomRepository.findById(orgId, id);
    if (!existing) throw new ApiError(404, "Room not found");

    if (body.number && body.number !== existing.number) {
      const existingNumber = await roomRepository.findByNumber(existing.hostelId, body.number);
      if (existingNumber) {
        throw new ApiError(409, "A room with this number already exists in this hostel");
      }
    }

    try {
      const row = await roomRepository.update(id, {
        number: body.number,
        capacity: body.capacity,
      });
      return serialize(row);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === "P2002") {
          throw new ApiError(409, "A room with this number already exists in this hostel");
        }
        if (err.code === "P2025") {
          throw new ApiError(404, "Room not found");
        }
      }
      throw err;
    }
  },

  remove: async (orgId: string, id: string) => {
    const existing = await roomRepository.findById(orgId, id);
    if (!existing) throw new ApiError(404, "Room not found");

    try {
      await roomRepository.remove(id);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2003") {
        throw new ApiError(409, "Cannot delete a room with assigned students");
      }
      throw err;
    }
  },
};
