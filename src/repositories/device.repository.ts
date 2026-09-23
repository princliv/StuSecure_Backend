import { prisma } from "../config/database.js";

export const deviceRepository = {
  upsert: (data: {
    organizationId: string;
    userId: string;
    token: string;
    platform: string;
    provider: string;
  }) =>
    prisma.deviceToken.upsert({
      where: { token: data.token },
      create: data,
      update: {
        organizationId: data.organizationId,
        userId: data.userId,
        platform: data.platform,
        provider: data.provider,
      },
    }),

  listByUserIds: (organizationId: string, userIds: string[]) =>
    prisma.deviceToken.findMany({
      where: { organizationId, userId: { in: userIds } },
    }),

  deleteByToken: (token: string) =>
    prisma.deviceToken.deleteMany({ where: { token } }),
};
