import { randomBytes } from "node:crypto";
import type { Invite, InviteStatus, Role } from "@prisma/client";
import { ApiError } from "../utils/ApiError.js";
import { prisma } from "../config/database.js";
import { parseCsv } from "../utils/csv.js";
import { inviteRepository } from "../repositories/invite.repository.js";
import { userRepository } from "../repositories/user.repository.js";
import { assertUnderPlanLimit } from "./plan.service.js";
import { serialize as serializeAuth } from "./auth.service.js";
import { auditLogService } from "./auditLog.service.js";
import type { CreateInviteBody } from "../validators/invite.validators.js";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const MAX_IMPORT_ROWS = 500;
const ROLE_VALUES: Role[] = ["STUDENT", "GUARD", "FACULTY", "ADMIN"];
const INVITE_STATUS_VALUES: InviteStatus[] = ["PENDING", "ACCEPTED", "REVOKED", "EXPIRED"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function newToken() {
  // Same style as `qr.service.ts`'s QR tokens: opaque, non-sequential,
  // no PII embedded.
  return randomBytes(24).toString("base64url");
}

function serialize(invite: Invite) {
  return {
    id: invite.id,
    organizationId: invite.organizationId,
    email: invite.email,
    role: invite.role,
    token: invite.token,
    status: invite.status,
    invitedByUserId: invite.invitedByUserId,
    createdAt: invite.createdAt.toISOString(),
    acceptedAt: invite.acceptedAt?.toISOString() ?? null,
    expiresAt: invite.expiresAt.toISOString(),
  };
}

/** An invite whose DB status is still PENDING but whose `expiresAt` has
 * passed is treated as EXPIRED for read purposes without a background job
 * to flip the row — see plan's "still return the preview... with the real
 * status" requirement. */
function resolveEffectiveStatus(invite: { status: InviteStatus; expiresAt: Date }): InviteStatus {
  if (invite.status === "PENDING" && invite.expiresAt.getTime() < Date.now()) {
    return "EXPIRED";
  }
  return invite.status;
}

function parsePaging(query: { page?: unknown; limit?: unknown }) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  return { page, limit, skip: (page - 1) * limit, take: limit };
}

/** Shared by `POST /orgs/:id/invites` and the CSV import path — the single
 * source of truth for "create one invite", including the pending-duplicate
 * pre-check. Throws `ApiError(409, ...)` on a duplicate pending invite. */
async function createOne(
  organizationId: string,
  invitedByUserId: string,
  email: string,
  role: Role,
): Promise<Invite> {
  const existing = await inviteRepository.findPendingByEmail(organizationId, email);
  if (existing) {
    throw new ApiError(409, `A pending invite already exists for ${email}`);
  }

  // Early, non-authoritative check: reject invite *creation* if the org is
  // already at/over its plan limit for this role, so an admin gets
  // immediate feedback instead of generating an invite that will fail at
  // accept time (accept() below re-checks — that's the authoritative point).
  await assertUnderPlanLimit(organizationId, role);

  const invite = await inviteRepository.create({
    organizationId,
    email,
    role,
    token: newToken(),
    invitedByUserId,
    expiresAt: new Date(Date.now() + INVITE_TTL_MS),
  });

  await auditLogService.record({
    organizationId,
    actorUserId: invitedByUserId,
    action: "invite.create",
    entityType: "Invite",
    entityId: invite.id,
    metadata: { email, role },
  });

  return invite;
}

export const inviteService = {
  create: async (orgId: string, invitedByUserId: string, body: CreateInviteBody) => {
    const invite = await createOne(orgId, invitedByUserId, body.email, body.role);
    return serialize(invite);
  },

  list: async (
    orgId: string,
    query: { page?: unknown; limit?: unknown; status?: unknown },
  ) => {
    const { page, limit, skip, take } = parsePaging(query);
    const status =
      typeof query.status === "string" && INVITE_STATUS_VALUES.includes(query.status as InviteStatus)
        ? (query.status as InviteStatus)
        : undefined;
    const [rows, total] = await inviteRepository.list({
      organizationId: orgId,
      status,
      skip,
      take,
    });
    return { invites: rows.map(serialize), total, page, limit };
  },

  revoke: async (orgId: string, inviteId: string, actorUserId: string | null) => {
    const existing = await inviteRepository.findById(orgId, inviteId);
    if (!existing) throw new ApiError(404, "Invite not found");
    if (existing.status !== "PENDING") {
      throw new ApiError(409, "Only a pending invite can be revoked");
    }

    // Soft-delete (status -> REVOKED), not a hard delete — deliberate
    // deviation from this codebase's usual hard-delete-everywhere
    // convention, because invite history (who was invited, by whom, when)
    // is audit-relevant. See plan's Group G invite feature spec.
    await inviteRepository.revoke(inviteId);
    await auditLogService.record({
      organizationId: orgId,
      actorUserId,
      action: "invite.revoke",
      entityType: "Invite",
      entityId: existing.id,
      metadata: { email: existing.email },
    });
  },

  preview: async (token: string) => {
    const invite = await inviteRepository.findByToken(token);
    if (!invite) throw new ApiError(404, "Invite not found");

    return {
      organizationName: invite.organization.name,
      role: invite.role,
      email: invite.email,
      status: resolveEffectiveStatus(invite),
    };
  },

  /**
   * Accepts an invite for an already Firebase-verified identity that may
   * not have a StuSecure `User` row yet. Upserts the `User`, creates the
   * `Membership` (idempotent if one already exists), marks the invite
   * ACCEPTED. Returns the same `{ user, memberships }` shape as
   * `POST /auth/sync` so the client can reuse its existing post-sync
   * handling.
   */
  accept: async (
    firebaseIdentity: { uid: string; email: string; name?: string },
    token: string,
  ) => {
    const invite = await inviteRepository.findByToken(token);
    if (!invite) throw new ApiError(404, "Invite not found");

    const effectiveStatus = resolveEffectiveStatus(invite);
    if (effectiveStatus !== "PENDING") {
      throw new ApiError(409, `Invite is ${effectiveStatus.toLowerCase()}, not pending`);
    }

    let user = await userRepository.findByFirebaseUid(firebaseIdentity.uid);
    if (!user) {
      user = await userRepository.create({
        firebaseUid: firebaseIdentity.uid,
        name: firebaseIdentity.name ?? firebaseIdentity.email,
        email: firebaseIdentity.email,
      });
    }

    // Authoritative enforcement point: a membership must never be created
    // past the plan limit, even if createOne()'s earlier check passed at
    // invite-creation time (limits could have changed, or other members
    // could have joined since).
    await assertUnderPlanLimit(invite.organizationId, invite.role);

    // Idempotent: re-accepting (or already being a member) succeeds rather
    // than erroring — `@@unique([userId, organizationId])` makes this a
    // clean upsert target.
    await prisma.membership.upsert({
      where: {
        userId_organizationId: { userId: user.id, organizationId: invite.organizationId },
      },
      update: {},
      create: { userId: user.id, organizationId: invite.organizationId, role: invite.role },
    });

    await inviteRepository.accept(invite.id);

    const refreshed = await userRepository.findByFirebaseUid(firebaseIdentity.uid);
    if (!refreshed) {
      throw new ApiError(500, "Failed to load user after accepting invite");
    }
    return serializeAuth(refreshed);
  },

  /**
   * Bulk-creates invites from CSV text: `name,email,role` with a header row
   * (row 0 is always skipped, header contents aren't otherwise validated).
   * A malformed/invalid/duplicate row is skipped individually — it does not
   * fail the whole batch. Caps at `MAX_IMPORT_ROWS` data rows.
   */
  importCsv: async (orgId: string, invitedByUserId: string, csv: string) => {
    const allRows = parseCsv(csv);
    // Row 0 is always treated as the header and skipped.
    const dataRows = allRows
      .slice(1)
      .filter((row) => !(row.length === 1 && row[0] === ""));

    const truncated = dataRows.length > MAX_IMPORT_ROWS;
    const rowsToProcess = dataRows.slice(0, MAX_IMPORT_ROWS);

    let created = 0;
    const skipped: { row: number; reason: string }[] = [];

    for (let index = 0; index < rowsToProcess.length; index += 1) {
      // +1 for the header row, +1 to make it 1-indexed like a spreadsheet.
      const rowNumber = index + 2;
      const row = rowsToProcess[index]!;

      if (row.length !== 3) {
        skipped.push({ row: rowNumber, reason: "Expected 3 columns: name,email,role" });
        continue;
      }

      const [, rawEmail, rawRole] = row;
      const email = (rawEmail ?? "").trim().toLowerCase();
      const role = (rawRole ?? "").trim().toUpperCase();

      if (!EMAIL_RE.test(email)) {
        skipped.push({ row: rowNumber, reason: `Invalid email: "${rawEmail}"` });
        continue;
      }
      if (!ROLE_VALUES.includes(role as Role)) {
        skipped.push({ row: rowNumber, reason: `Invalid role: "${rawRole}"` });
        continue;
      }

      try {
        await createOne(orgId, invitedByUserId, email, role as Role);
        created += 1;
      } catch (err) {
        if (err instanceof ApiError) {
          skipped.push({ row: rowNumber, reason: err.message });
        } else {
          throw err;
        }
      }
    }

    return { created, skipped, truncated };
  },
};
