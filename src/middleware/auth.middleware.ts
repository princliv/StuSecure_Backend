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
 * user (with their memberships). Use this for every route except
 * `/auth/sync`.
 *
 * `role`/`organizationId` default to the user's first membership (so the
 * type stays non-optional for the ~15 existing read sites) but are just a
 * placeholder — routes that actually need a resolved *active* org must run
 * `attachTenant` afterward, which overrides them from the real active
 * membership (X-Org-Id header, or the single membership, or a clear error
 * if the active org is ambiguous). A user with zero memberships can still
 * pass `requireAuth` (e.g. to hit `GET /orgs/mine` or `POST /orgs`) — such
 * routes must not chain `attachTenant`.
 */
export const requireAuth = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    const idToken = extractBearerToken(req);
    const decoded = await verifyToken(idToken);

    // The role and org always come from our own database, never from the
    // client or the Firebase token — see docs/StuSecure_SaaS_Plan.md §2.
    const user = await prisma.user.findUnique({
      where: { firebaseUid: decoded.uid },
      select: {
        id: true,
        firebaseUid: true,
        isPlatformAdmin: true,
        memberships: {
          select: {
            organizationId: true,
            role: true,
            organization: { select: { name: true, status: true } },
          },
        },
      },
    });

    if (!user) {
      throw new ApiError(401, "No StuSecure account for this identity");
    }

    const memberships = user.memberships.map((m) => ({
      organizationId: m.organizationId,
      role: m.role,
      organizationName: m.organization.name,
      organizationStatus: m.organization.status,
    }));

    req.user = {
      id: user.id,
      firebaseUid: user.firebaseUid,
      isPlatformAdmin: user.isPlatformAdmin,
      memberships,
      // Placeholder default — see docstring above. `attachTenant` overrides
      // these with the real active membership for routes that need one.
      role: memberships[0]?.role as (typeof memberships)[number]["role"],
      organizationId: memberships[0]?.organizationId as string,
    };
    next();
  },
);
