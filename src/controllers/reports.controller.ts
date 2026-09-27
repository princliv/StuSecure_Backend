import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { reportsService } from "../services/reports.service.js";

export const getReportSummary = asyncHandler(async (req: Request, res: Response) => {
  if (!req.orgId) throw new ApiError(400, "Organization context missing");
  const result = await reportsService.summary(req.orgId, req.query);
  res.status(200).json(result);
});

export const getReportOverview = asyncHandler(async (req: Request, res: Response) => {
  if (!req.orgId) throw new ApiError(400, "Organization context missing");
  const result = await reportsService.overview(req.orgId);
  res.status(200).json(result);
});

export const getMovementsCsv = asyncHandler(async (req: Request, res: Response) => {
  if (!req.orgId) throw new ApiError(400, "Organization context missing");
  const { csv, from, to } = await reportsService.movementsCsv(req.orgId, req.query);
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="movements-${from}-to-${to}.csv"`,
  );
  res.status(200).send(csv);
});
