import { z } from "zod";

export const scanBodySchema = z.object({
  qrToken: z.string().trim().min(8, "QR token is required"),
  location: z.string().trim().max(200).optional(),
});

export type ScanBody = z.infer<typeof scanBodySchema>;
