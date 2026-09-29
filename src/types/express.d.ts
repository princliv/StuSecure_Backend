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
        /** Platform-wide super-admin flag — orthogonal to org membership.
         * See docs/StuSecure_SaaS_Plan.md Group G3. */
        isPlatformAdmin: boolean;
        /** Every org this user belongs to. `role`/`organizationId` above are
         * request-scoped (resolved by `attachTenant`), this is the full list —
         * see docs/StuSecure_SaaS_Plan.md Group G. */
        memberships: {
          organizationId: string;
          role: Role;
          organizationName: string;
          organizationStatus: string;
        }[];
      };
      /** Set by `attachTenant` — the active organization for this request. */
      orgId?: string;
    }
  }
}

export {};
