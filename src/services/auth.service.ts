import type { Role } from "@prisma/client";
import { ApiError } from "../utils/ApiError.js";
import { userRepository } from "../repositories/user.repository.js";
import { organizationRepository } from "../repositories/organization.repository.js";
import { prisma } from "../config/database.js";
import type { ClaimBody, SyncBody } from "../validators/auth.validators.js";

interface FirebaseIdentity {
  uid: string;
  email: string;
  name?: string;
}

interface UserWithMemberships {
  id: string;
  firebaseUid: string;
  email: string;
  name: string;
  isPlatformAdmin: boolean;
  createdAt: Date;
  memberships: {
    organizationId: string;
    role: Role;
    organization: {
      id: string;
      name: string;
      slug: string;
      logoUrl?: string | null;
      primaryColor?: string | null;
    };
  }[];
}

/** Shared `{ user, memberships }` response shape reused by `/auth/sync`,
 * `/auth/me`, `POST /orgs`, and (pass 2) invite acceptance. Includes
 * branding (logoUrl/primaryColor) per org — see
 * docs/StuSecure_SaaS_Plan.md Group G4. */
export function serialize(user: UserWithMemberships) {
  const memberships = user.memberships.map((m) => ({
    organizationId: m.organizationId,
    organizationName: m.organization.name,
    organizationSlug: m.organization.slug,
    organizationLogoUrl: m.organization.logoUrl ?? null,
    organizationPrimaryColor: m.organization.primaryColor ?? null,
    role: m.role,
  }));

  return {
    user: {
      id: user.id,
      firebaseUid: user.firebaseUid,
      email: user.email,
      displayName: user.name,
      isPlatformAdmin: user.isPlatformAdmin,
      createdAt: user.createdAt.toISOString(),
    },
    memberships,
  };
}

export const authService = {
  /**
   * Upserts a StuSecure account for an already-verified Firebase identity.
   * `body` (displayName) is required only to provision a brand-new account;
   * an existing account ignores it. A new account is created with zero
   * memberships — joining an org happens separately via `POST /orgs`
   * (create one) or accepting an invite.
   */
  sync: async (identity: FirebaseIdentity, body: SyncBody | undefined) => {
    const existing = await userRepository.findByFirebaseUid(identity.uid);
    if (existing) {
      return serialize(existing);
    }

    if (!body) {
      throw new ApiError(
        404,
        "No StuSecure account for this identity — registration required",
      );
    }

    const created = await userRepository.create({
      firebaseUid: identity.uid,
      name: body.displayName,
      email: identity.email,
    });

    return serialize(created);
  },

  /**
   * Claims an admin-pre-provisioned account (`User.firebaseUid` still the
   * `pending:<uuid>` placeholder set by Student/Guard/Faculty
   * `createWithUser`) for an already Firebase-verified identity. No new
   * `Membership` is ever created here — only an existing pre-provisioned one
   * is attached to a real Firebase UID. Mirrors `invite.service.ts`'s
   * `accept()` for structure/style.
   */
  claim: async (identity: FirebaseIdentity, body: ClaimBody) => {
    const existing = await userRepository.findByFirebaseUid(identity.uid);
    if (existing && !existing.firebaseUid.startsWith("pending:")) {
      // Idempotent: resubmitting after a successful claim just returns the
      // same profile instead of erroring.
      return serialize(existing);
    }

    const org = await organizationRepository.findBySlug(body.organization);
    if (!org) {
      throw new ApiError(404, "Organization not found");
    }

    const user = await userRepository.findByEmail(identity.email);
    if (!user) {
      throw new ApiError(
        404,
        "No pre-provisioned account found for this email — contact your organization admin.",
      );
    }
    if (!user.firebaseUid.startsWith("pending:")) {
      throw new ApiError(409, "This email is already registered. Try signing in instead.");
    }

    const membership = await prisma.membership.findUnique({
      where: { userId_organizationId: { userId: user.id, organizationId: org.id } },
    });
    if (!membership) {
      throw new ApiError(404, "No account found for this email in that organization.");
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { firebaseUid: identity.uid, name: body.displayName },
    });

    const refreshed = await userRepository.findByFirebaseUid(identity.uid);
    if (!refreshed) {
      throw new ApiError(500, "Failed to load user after claiming account");
    }
    return serialize(refreshed);
  },

  me: async (firebaseUid: string) => {
    const user = await userRepository.findByFirebaseUid(firebaseUid);
    if (!user) {
      throw new ApiError(404, "No StuSecure account for this identity");
    }
    return serialize(user);
  },
};
