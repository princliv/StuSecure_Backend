import type { Role } from "@prisma/client";
import { ApiError } from "../utils/ApiError.js";
import { organizationRepository } from "../repositories/organization.repository.js";
import { userRepository } from "../repositories/user.repository.js";
import type { SyncBody } from "../validators/auth.validators.js";

interface FirebaseIdentity {
  uid: string;
  email: string;
  name?: string;
}

interface UserWithOrg {
  id: string;
  firebaseUid: string;
  email: string;
  name: string;
  role: Role;
  organizationId: string;
  createdAt: Date;
  organization: { id: string; name: string };
}

function serialize(user: UserWithOrg) {
  return {
    user: {
      id: user.id,
      firebaseUid: user.firebaseUid,
      email: user.email,
      displayName: user.name,
      role: user.role,
      organizationId: user.organizationId,
      createdAt: user.createdAt.toISOString(),
    },
    // Always a single entry for now — see Organization model comment in
    // schema.prisma. Kept as an array so the frontend contract doesn't have
    // to change again once multi-org membership lands.
    memberships: [
      {
        organizationId: user.organization.id,
        organizationName: user.organization.name,
        role: user.role,
      },
    ],
  };
}

export const authService = {
  /**
   * Upserts a StuSecure account for an already-verified Firebase identity.
   * `body` (displayName + role) is required only to provision a brand-new
   * account; an existing account ignores it.
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

    const organization = await organizationRepository.getOrCreateDefault();
    const created = await userRepository.create({
      firebaseUid: identity.uid,
      name: body.displayName,
      email: identity.email,
      role: body.role,
      organizationId: organization.id,
    });

    return serialize(created);
  },

  me: async (firebaseUid: string) => {
    const user = await userRepository.findByFirebaseUid(firebaseUid);
    if (!user) {
      throw new ApiError(404, "No StuSecure account for this identity");
    }
    return serialize(user).user;
  },
};
