import type { Role } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      /** Set by `verifyFirebaseToken` — the token is valid but may not have a StuSecure account yet. */
      firebaseToken?: {
        uid: string;
        email: string;
        name?: string;
      };
      /** Set by `requireAuth` once the Firebase identity is resolved to a StuSecure user. */
      user?: {
        id: string;
        firebaseUid: string;
        role: Role;
        organizationId: string;
      };
      /** Set by `attachTenant` — the active organization for this request. */
      orgId?: string;
    }
  }
}

export {};
