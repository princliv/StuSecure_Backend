import type { NotificationType, Role } from "@prisma/client";
import { notificationRepository } from "../repositories/notification.repository.js";
import { userRepository } from "../repositories/user.repository.js";
import { pushService } from "./push.service.js";
import { ApiError } from "../utils/ApiError.js";
import { logger } from "../utils/logger.js";

function serialize(row: { id: string; title: string; body: string; type: NotificationType; isRead: boolean; createdAt: Date; readAt: Date | null }) {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    type: row.type,
    isRead: row.isRead,
    createdAt: row.createdAt.toISOString(),
    readAt: row.readAt?.toISOString() ?? null,
  };
}

function parsePaging(query: { page?: unknown; limit?: unknown }) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  return { page, limit, skip: (page - 1) * limit, take: limit };
}

export const notificationService = {
  notify: async (args: {
    organizationId: string;
    userIds: string[];
    title: string;
    body: string;
    type: NotificationType;
    channelId?: string;
  }) => {
    const userIds = [...new Set(args.userIds.filter(Boolean))];
    if (userIds.length === 0) return;
    try {
      await notificationRepository.createMany(
        userIds.map((userId) => ({
          organizationId: args.organizationId,
          userId,
          title: args.title,
          body: args.body,
          type: args.type,
        })),
      );
      void pushService.sendToUsers(args.organizationId, userIds, {
        title: args.title,
        body: args.body,
        channelId: args.channelId,
        data: { type: args.type },
      });
    } catch (err) {
      logger.warn("Could not persist/send notifications", err);
    }
  },

  notifyRoles: async (
    organizationId: string,
    roles: Role[],
    payload: {
      title: string;
      body: string;
      type: NotificationType;
      channelId?: string;
      excludeUserId?: string;
    },
  ) => {
    const users = await userRepository.findIdsByRoles(organizationId, roles);
    const userIds = users
      .map((u) => u.id)
      .filter((id) => id !== payload.excludeUserId);
    await notificationService.notify({
      organizationId,
      userIds,
      title: payload.title,
      body: payload.body,
      type: payload.type,
      channelId: payload.channelId,
    });
  },

  listMine: async (
    user: { id: string },
    orgId: string,
    query: { page?: unknown; limit?: unknown; unread?: unknown },
  ) => {
    const { page, limit, skip, take } = parsePaging(query);
    const unreadOnly = query.unread === "true" || query.unread === "1";
    const [rows, total] = await notificationRepository.listForUser({
      organizationId: orgId,
      userId: user.id,
      unreadOnly,
      skip,
      take,
    });
    return { notifications: rows.map(serialize), total, page, limit };
  },

  markRead: async (user: { id: string }, orgId: string, id: string) => {
    const row = await notificationRepository.findById(orgId, user.id, id);
    if (!row) throw new ApiError(404, "Notification not found");
    const updated = await notificationRepository.markRead(id);
    return serialize(updated);
  },

  markAllRead: async (user: { id: string }, orgId: string) => {
    const result = await notificationRepository.markAllRead(orgId, user.id);
    return { updated: result.count };
  },
};
