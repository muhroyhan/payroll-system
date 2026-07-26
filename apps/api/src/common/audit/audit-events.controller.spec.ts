import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { AuditEntityType } from '@payroll-system/shared-types';
import { AuditEventsController } from './audit-events.controller';
import { AuditEventsService } from './audit-events.service';

// audit_events is append-only (§ task item 1) — there must be no code path,
// admin or otherwise, that can update or delete a row. Proven structurally
// here (the controller class itself exposes no such method/route) rather
// than only by "no such DTO exists", since a missing route is what actually
// stops a client from calling it.
describe('AuditEventsController — append-only (no update/delete route)', () => {
  it('exposes exactly one handler method, and it is a GET', () => {
    const methodNames = Object.getOwnPropertyNames(
      AuditEventsController.prototype,
    ).filter((name) => name !== 'constructor');

    expect(methodNames).toEqual(['list']);

    const method = Reflect.getMetadata(
      METHOD_METADATA,
      AuditEventsController.prototype.list,
    );
    expect(method).toBe(RequestMethod.GET);
  });

  it('the one route is GET /audit-events (list), not a per-id route that could later grow a sibling PUT/DELETE', () => {
    const path = Reflect.getMetadata(
      PATH_METADATA,
      AuditEventsController.prototype.list,
    );
    expect(path).toBe('/');
  });

  it('list() only reads — delegates to AuditEventsService.listForEntity, a method with no side effects', async () => {
    const listForEntity = jest.fn().mockResolvedValue([]);
    const controller = new AuditEventsController({
      listForEntity,
    } as unknown as AuditEventsService);

    await controller.list({
      entityType: AuditEntityType.PAYROLL_RUN,
      entityId: 'run-1',
    });

    expect(listForEntity).toHaveBeenCalledWith(
      AuditEntityType.PAYROLL_RUN,
      'run-1',
    );
  });
});
