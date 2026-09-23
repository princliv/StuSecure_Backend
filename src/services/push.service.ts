import { firebaseMessaging } from "../config/firebase.js";
import { logger } from "../utils/logger.js";
import { deviceRepository } from "../repositories/device.repository.js";

type PushPayload = {
  title: string;
  body: string;
  data?: Record<string, string>;
  channelId?: string;
};

function isExpoToken(token: string) {
  return token.startsWith("ExponentPushToken") || token.startsWith("ExpoPushToken");
}

async function sendExpo(tokens: string[], payload: PushPayload) {
  if (tokens.length === 0) return;
  const res = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Accept-Encoding": "gzip, deflate",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(
      tokens.map((to) => ({
        to,
        title: payload.title,
        body: payload.body,
        sound: "default",
        priority: "high",
        channelId: payload.channelId ?? "default",
        data: payload.data ?? {},
      })),
    ),
  });

  if (!res.ok) {
    logger.warn(`Expo push HTTP ${res.status}`);
    return;
  }

  const json = (await res.json()) as {
    data?: { status: string; details?: { error?: string } }[];
  };
  json.data?.forEach((ticket, i) => {
    if (ticket.status === "error") {
      const err = ticket.details?.error;
      if (err === "DeviceNotRegistered" && tokens[i]) {
        void deviceRepository.deleteByToken(tokens[i]);
      }
    }
  });
}

async function sendFcm(tokens: string[], payload: PushPayload) {
  for (const token of tokens) {
    try {
      await firebaseMessaging.send({
        token,
        notification: { title: payload.title, body: payload.body },
        data: payload.data,
        android: {
          priority: "high",
          notification: {
            channelId: payload.channelId ?? "default",
            sound: "default",
          },
        },
        apns: {
          payload: {
            aps: { sound: "default", badge: 1 },
          },
        },
      });
    } catch (err) {
      const code = (err as { code?: string }).code ?? "";
      if (
        code.includes("registration-token-not-registered") ||
        code.includes("invalid-registration-token")
      ) {
        void deviceRepository.deleteByToken(token);
      } else {
        logger.warn("FCM send failed", err);
      }
    }
  }
}

export const pushService = {
  sendToUsers: async (
    organizationId: string,
    userIds: string[],
    payload: PushPayload,
  ) => {
    if (userIds.length === 0) return;
    try {
      const devices = await deviceRepository.listByUserIds(organizationId, userIds);
      const expo = devices.filter((d) => isExpoToken(d.token)).map((d) => d.token);
      const fcm = devices.filter((d) => !isExpoToken(d.token)).map((d) => d.token);
      await Promise.all([sendExpo(expo, payload), sendFcm(fcm, payload)]);
    } catch (err) {
      logger.warn("Push delivery failed", err);
    }
  },
};
