import type { Role } from "@prisma/client";
import { prisma } from "../config/database.js";

export const userRepository = {
  findByFirebaseUid: (firebaseUid: string) =>
    prisma.user.findUnique({
      where: { firebaseUid },
      include: { organization: true },
    }),

  create: (data: {
    firebaseUid: string;
    name: string;
    email: string;
    role: Role;
    organizationId: string;
  }) =>
    prisma.user.create({
      data,
      include: { organization: true },
    }),

  findIdsByRoles: (organizationId: string, roles: Role[]) =>
    prisma.user.findMany({
      where: { organizationId, role: { in: roles } },
      select: { id: true },
    }),
};
