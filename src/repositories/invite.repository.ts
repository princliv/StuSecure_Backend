import type { InviteStatus, Role } from "@prisma/client";
import { prisma } from "../config/database.js";

export const inviteRepository = {
  /** App-level pre-check for "one active invite per email per org" — the
   * DB-level `@@unique([organizationId, email, status])` composite from the
   * original plan draft was dropped in pass 1 (Prisma can't express "unique
   * only when status=PENDING" cleanly), so this mirrors the
   * check-before-insert pattern `student.repository.ts` already uses for
   * email/enrollmentNo. */
  findPendingByEmail: (organizationId: string, email: string) =>
    prisma.invite.findFirst({
      where: { organizationId, email, status: "PENDING" },
    }),

  findById: (organizationId: string, id: string) =>
    prisma.invite.findFirst({ where: { organizationId, id } }),

  findByToken: (token: string) =>
    prisma.invite.findUnique({
      where: { token },
      include: { organization: { select: { name: true } } },
    }),

  list: (args: {
    organizationId: string;
    status?: InviteStatus;
    skip: number;
    take: number;
  }) => {
    const where = {
      organizationId: args.organizationId,
      ...(args.status ? { status: args.status } : {}),
    };
    return Promise.all([
      prisma.invite.findMany({
        where,
        orderBy: { createdAt: "desc" as const },
        skip: args.skip,
        take: args.take,
      }),
      prisma.invite.count({ where }),
    ]);
  },

  create: (data: {
    organizationId: string;
    email: string;
    role: Role;
    token: string;
    invitedByUserId: string;
    expiresAt: Date;
  }) => prisma.invite.create({ data }),

  revoke: (id: string) =>
    prisma.invite.update({ where: { id }, data: { status: "REVOKED" } }),

  accept: (id: string) =>
    prisma.invite.update({
      where: { id },
      data: { status: "ACCEPTED", acceptedAt: new Date() },
    }),
};
