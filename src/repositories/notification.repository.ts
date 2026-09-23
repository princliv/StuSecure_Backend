import type { NotificationType } from "@prisma/client";
import { prisma } from "../config/database.js";

export const notificationRepository = {
  createMany: (
    rows: {
      organizationId: string;
      userId: string;
      title: string;
      body: string;
      type: NotificationType;
    }[],
  ) => prisma.notification.createMany({ data: rows }),

  listForUser: (args: {
    organizationId: string;
    userId: string;
    unreadOnly?: boolean;
    skip: number;
    take: number;
  }) =>
    Promise.all([
      prisma.notification.findMany({
        where: {
          organizationId: args.organizationId,
          userId: args.userId,
          isRead: args.unreadOnly ? false : undefined,
        },
        orderBy: { createdAt: "desc" },
        skip: args.skip,
        take: args.take,
      }),
      prisma.notification.count({
        where: {
          organizationId: args.organizationId,
          userId: args.userId,
          isRead: args.unreadOnly ? false : undefined,
        },
      }),
    ]),

  findById: (organizationId: string, userId: string, id: string) =>
    prisma.notification.findFirst({
      where: { id, organizationId, userId },
    }),

  markRead: (id: string) =>
    prisma.notification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    }),

  markAllRead: (organizationId: string, userId: string) =>
    prisma.notification.updateMany({
      where: { organizationId, userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    }),
};
