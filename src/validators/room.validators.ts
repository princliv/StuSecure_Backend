import { z } from "zod";

export const createRoomBodySchema = z.object({
  hostelId: z.string().trim().min(1, "hostelId is required"),
  number: z.string().trim().min(1, "Room number is required"),
  capacity: z.number().int().positive().optional(),
});

export type CreateRoomBody = z.infer<typeof createRoomBodySchema>;

export const updateRoomBodySchema = z.object({
  number: z.string().trim().min(1, "Room number is required").optional(),
  capacity: z.number().int().positive().optional(),
});

export type UpdateRoomBody = z.infer<typeof updateRoomBodySchema>;
