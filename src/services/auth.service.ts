import type { Role } from "@prisma/client";
import { ApiError } from "../utils/ApiError.js";
import { userRepository } from "../repositories/user.repository.js";
import type { SyncBody } from "../validators/auth.validators.js";

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
  createdAt: Date;
  memberships: {
    organizationId: string;
    role: Role;
    organization: { id: string; name: string };
  }[];
}

/** Shared `{ user, memberships }` response shape reused by `/auth/sync`,
 * `/auth/me`, `POST /orgs`, and (pass 2) invite acceptance. */
export function serialize(user: UserWithMemberships) {
  const memberships = user.memberships.map((m) => ({
    organizationId: m.organizationId,
    organizationName: m.organization.name,
    role: m.role,
  }));

  return {
    user: {
      id: user.id,
      firebaseUid: user.firebaseUid,
      email: user.email,
      displayName: user.name,
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

  me: async (firebaseUid: string) => {
    const user = await userRepository.findByFirebaseUid(firebaseUid);
    if (!user) {
      throw new ApiError(404, "No StuSecure account for this identity");
    }
    return serialize(user);
  },
};
