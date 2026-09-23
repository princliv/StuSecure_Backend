import { deviceRepository } from "../repositories/device.repository.js";
import type { RegisterDeviceBody } from "../validators/device.validators.js";

function inferProvider(token: string, explicit?: "EXPO" | "FCM") {
  if (explicit) return explicit;
  if (token.startsWith("ExponentPushToken") || token.startsWith("ExpoPushToken")) {
    return "EXPO";
  }
  return "FCM";
}

export const deviceService = {
  register: async (
    user: { id: string; organizationId: string },
    orgId: string,
    body: RegisterDeviceBody,
  ) => {
    const row = await deviceRepository.upsert({
      organizationId: orgId,
      userId: user.id,
      token: body.token,
      platform: body.platform,
      provider: inferProvider(body.token, body.provider),
    });
    return {
      id: row.id,
      platform: row.platform,
      provider: row.provider,
    };
  },
};
