import type { AuditAction, AuditEntityType } from '@payroll-system/shared-types';
import { apiClient } from '../../api/client';

// Mirrors apps/api/src/common/audit/entities/audit-event.entity.ts. Read-only
// — there is deliberately no create/update/delete function here, matching
// the backend's admin-only GET-only AuditEventsController.
export interface AuditEvent {
  id: string;
  entityType: AuditEntityType;
  entityId: string;
  action: AuditAction;
  actorId: string | null;
  actorRole: string | null;
  changedFields: Record<string, { before: unknown; after: unknown }>;
  reason: string | null;
  createdAt: string;
}

export async function listAuditEvents(
  entityType: AuditEntityType,
  entityId: string,
): Promise<AuditEvent[]> {
  const { data } = await apiClient.get<AuditEvent[]>('/audit-events', {
    params: { entityType, entityId },
  });
  return data;
}
