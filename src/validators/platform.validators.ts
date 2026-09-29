import { z } from "zod";
import { PLAN_LIMITS } from "../config/plans.js";

const planKeys = Object.keys(PLAN_LIMITS) as [string, ...string[]];

export const updateOrganizationBodySchema = z
  .object({
    plan: z.enum(planKeys).optional(),
    status: z.enum(["ACTIVE", "SUSPENDED"]).optional(),
  })
  .refine((body) => body.plan !== undefined || body.status !== undefined, {
    message: "At least one of plan or status is required",
  });

export type UpdateOrganizationBody = z.infer<typeof updateOrganizationBodySchema>;
