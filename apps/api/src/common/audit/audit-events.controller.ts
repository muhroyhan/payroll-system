import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Role } from '@payroll-system/shared-types';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { AuditEventsService } from './audit-events.service';
import { ListAuditEventsQueryDto } from './dto/list-audit-events-query.dto';

// Admin-only, read-only — deliberately no POST/PUT/PATCH/DELETE route in this
// controller. audit_events is append-only (written only by the hooks in
// audit-log.util.ts); there is no code path, admin or otherwise, that can
// edit or delete a row here.
@Controller('audit-events')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AuditEventsController {
  constructor(private readonly auditEventsService: AuditEventsService) {}

  @Get()
  list(@Query() query: ListAuditEventsQueryDto) {
    return this.auditEventsService.listForEntity(
      query.entityType,
      query.entityId,
    );
  }
}
