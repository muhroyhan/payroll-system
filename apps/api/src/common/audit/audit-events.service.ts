import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { AuditEntityType } from '@payroll-system/shared-types';
import { AuditEvent } from './entities/audit-event.entity';

// Read-only by design — audit_events is append-only (written exclusively by
// registerAuditLog's hooks, see audit-log.util.ts). No update()/remove() here
// on purpose: there must be no code path, admin or otherwise, that can edit
// or delete an audit row.
@Injectable()
export class AuditEventsService {
  constructor(
    @InjectModel(AuditEvent)
    private readonly auditEventModel: typeof AuditEvent,
  ) {}

  listForEntity(
    entityType: AuditEntityType,
    entityId: string,
  ): Promise<AuditEvent[]> {
    return this.auditEventModel.findAll({
      where: { entityType, entityId },
      order: [['createdAt', 'DESC']],
      // BUGS#19 — id/name only so the panel can render "Oleh" by name.
      include: [{ association: 'actor', attributes: ['id', 'name'] }],
    });
  }
}
