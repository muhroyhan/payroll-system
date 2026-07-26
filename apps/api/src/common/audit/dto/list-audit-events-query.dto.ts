import { IsEnum, IsUUID } from 'class-validator';
import { AuditEntityType } from '@payroll-system/shared-types';

// GET /audit-events always scopes to one record's history (§5 of the
// task) — entityType + entityId are both required rather than optional
// filters, so this endpoint can't be used to page through the whole trail.
export class ListAuditEventsQueryDto {
  @IsEnum(AuditEntityType)
  entityType: AuditEntityType;

  @IsUUID()
  entityId: string;
}
