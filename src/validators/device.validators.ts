import { z } from "zod";

export const registerDeviceSchema = z.object({
  token: z.string().trim().min(8).max(4096),
  platform: z.enum(["IOS", "ANDROID", "WEB"]),
  provider: z.enum(["EXPO", "FCM"]).optional(),
});

export type RegisterDeviceBody = z.infer<typeof registerDeviceSchema>;
