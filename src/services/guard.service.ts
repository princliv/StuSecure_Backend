import { guardRepository } from "../repositories/guard.repository.js";

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
  list: async (orgId: string, query: { page?: unknown; limit?: unknown }) => {
    const { page, limit, skip, take } = parsePaging(query);
    const [rows, total] = await guardRepository.list({
      organizationId: orgId,
      skip,
      take,
    });
    return { guards: rows.map(serialize), total, page, limit };
  },
};
