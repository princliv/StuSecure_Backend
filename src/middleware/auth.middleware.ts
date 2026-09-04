import type { NextFunction, Request, Response } from "express";
import { firebaseAuth } from "../config/firebase.js";
import { prisma } from "../config/database.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const requireAuth = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      throw new ApiError(401, "Missing bearer token");
    }

    const idToken = header.slice("Bearer ".length);
    const decoded = await firebaseAuth.verifyIdToken(idToken);

    // The role always comes from our own database, never from the client
    // or the Firebase token — see docs/StuSecure_Roadmap.pdf, section 4.
    const user = await prisma.user.findUnique({
      where: { firebaseUid: decoded.uid },
    });

    if (!user) {
      throw new ApiError(401, "No StuSecure account for this identity");
    }

    req.user = { id: user.id, firebaseUid: user.firebaseUid, role: user.role };
    next();
  },
);
