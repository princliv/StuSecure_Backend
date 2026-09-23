import type { NextFunction, Request, Response } from "express";
import { firebaseAuth } from "../config/firebase.js";
import { prisma } from "../config/database.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

function extractBearerToken(req: Request): string {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    throw new ApiError(401, "Missing bearer token");
  }
  return header.slice("Bearer ".length);
}

async function verifyToken(idToken: string) {
  try {
    return await firebaseAuth.verifyIdToken(idToken);
  } catch {
    throw new ApiError(401, "Invalid or expired token");
  }
}

/**
 * Verifies the Firebase ID token only — does not require a StuSecure account
 * to already exist. Use this (instead of `requireAuth`) for the one route
 * that has to work for a brand-new identity: `POST /auth/sync`.
 */
export const verifyFirebaseToken = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    const idToken = extractBearerToken(req);
    const decoded = await verifyToken(idToken);

    if (!decoded.email) {
      throw new ApiError(400, "Firebase account has no email address");
    }

    req.firebaseToken = {
      uid: decoded.uid,
      email: decoded.email,
      name: typeof decoded.name === "string" ? decoded.name : undefined,
    };
    next();
  },
);

/**
 * Verifies the Firebase ID token AND resolves it to an existing StuSecure
 * user (with role + organization). Use this for every route except
 * `/auth/sync`.
 */
export const requireAuth = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    const idToken = extractBearerToken(req);
    const decoded = await verifyToken(idToken);

    // The role and org always come from our own database, never from the
    // client or the Firebase token — see docs/StuSecure_SaaS_Plan.md §2.
    const user = await prisma.user.findUnique({
      where: { firebaseUid: decoded.uid },
      select: { id: true, firebaseUid: true, role: true, organizationId: true },
    });

    if (!user) {
      throw new ApiError(401, "No StuSecure account for this identity");
    }

    req.user = user;
    next();
  },
);
