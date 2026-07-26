import { useQuery } from '@tanstack/react-query';
import type { AuditEntityType } from '@payroll-system/shared-types';
import { listAuditEvents } from './api';

export function useAuditEventsQuery(
  entityType: AuditEntityType,
  entityId: string | undefined,
) {
  return useQuery({
    queryKey: ['audit-events', entityType, entityId],
    queryFn: () => listAuditEvents(entityType, entityId as string),
    enabled: !!entityId,
  });
}
