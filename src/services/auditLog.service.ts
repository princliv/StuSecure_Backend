import { auditLogRepository } from "../repositories/auditLog.repository.js";
import { logger } from "../utils/logger.js";

/**
 * Administrative/structural mutation audit trail — see
 * docs/StuSecure_SaaS_Plan.md §8 "Audit log includes org + actor".
 *
 * Deliberately never throws: a failed audit-log write must never fail (or
 * even appear to fail) the primary action it's attached to. Call this
 * AFTER the primary write has already succeeded.
 */
export const auditLogService = {
  record: async (params: {
    organizationId: string;
    actorUserId: string | null;
    action: string;
    entityType: string;
    entityId: string;
    metadata?: Record<string, unknown>;
  }) => {
    try {
      await auditLogRepository.create({
        organizationId: params.organizationId,
        actorUserId: params.actorUserId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        metadata: params.metadata as never,
      });
    } catch (err) {
      logger.warn("audit log write failed", {
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        error: err instanceof Error ? err.message : err,
      });
    }
  },
};
