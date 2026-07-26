import { AuditAction } from '@payroll-system/shared-types';
import { AuditEvent } from './entities/audit-event.entity';
import { registerAuditLog } from './audit-log.util';

// Proves the actual claim behind audit_events: before/after values are
// captured correctly (only for tracked fields, only when Sequelize reports
// them as actually changed), for create/update/destroy alike. Uses a plain
// stub model/instance (same convention as the rest of this codebase's specs,
// e.g. payroll-runs.service.spec.ts) rather than a real Sequelize connection.
describe('registerAuditLog', () => {
  function makeModel(attributeNames: string[]) {
    const hooks: Record<string, (...args: any[]) => any> = {};
    const model = {
      getAttributes: () =>
        Object.fromEntries(attributeNames.map((name) => [name, {}])),
      addHook: (
        type: string,
        _name: string,
        fn: (...args: any[]) => any,
      ) => {
        hooks[type] = fn;
      },
    };
    return { model: model as any, hooks };
  }

  function makeInstance(
    values: Record<string, unknown>,
    changed: string[] = [],
    previous: Record<string, unknown> = {},
  ) {
    return {
      id: values.id ?? 'entity-1',
      get: (field: string) => values[field],
      changed: () => changed,
      previous: (field: string) => previous[field],
    };
  }

  let createSpy: jest.SpyInstance;

  beforeEach(() => {
    createSpy = jest.spyOn(AuditEvent, 'create').mockResolvedValue({} as any);
  });

  afterEach(() => {
    createSpy.mockRestore();
  });

  it('afterCreate: records every tracked field as {before: null, after: value}', async () => {
    const { model, hooks } = makeModel(['id', 'status', 'createdAt']);
    registerAuditLog(model, 'TestEntity', { trackedFields: ['status'] });

    const instance = makeInstance({ id: 'e-1', status: 'draft' });
    await hooks.afterCreate(instance, { actorId: 'u-1', actorRole: 'admin' });

    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'TestEntity',
        entityId: 'e-1',
        action: AuditAction.CREATE,
        actorId: 'u-1',
        actorRole: 'admin',
        changedFields: { status: { before: null, after: 'draft' } },
        reason: null,
      }),
      { transaction: undefined },
    );
  });

  it('afterCreate: the technical fields (id/createdAt/updatedAt) are never tracked, even without an explicit trackedFields list', async () => {
    const { model, hooks } = makeModel(['id', 'status', 'createdAt', 'updatedAt']);
    registerAuditLog(model, 'TestEntity');

    const instance = makeInstance({ id: 'e-1', status: 'draft' });
    await hooks.afterCreate(instance, {});

    const [payload] = createSpy.mock.calls[0];
    expect(Object.keys(payload.changedFields)).toEqual(['status']);
  });

  it('afterUpdate: records only fields Sequelize reports as changed, with the real before/after values — untracked fields never leak in', async () => {
    const { model, hooks } = makeModel([
      'id',
      'status',
      'approvedBy',
      'processedCount',
    ]);
    registerAuditLog(model, 'TestEntity', {
      trackedFields: ['status', 'approvedBy'],
    });

    // processedCount also changed (a same-transaction progress tick, say),
    // but it's not in trackedFields and must not appear in the audit row.
    const instance = makeInstance(
      { id: 'e-1', status: 'approved', approvedBy: 'u-2', processedCount: 50 },
      ['status', 'approvedBy', 'processedCount'],
      { status: 'calculated', approvedBy: null, processedCount: 40 },
    );
    await hooks.afterUpdate(instance, {
      actorId: 'u-2',
      actorRole: 'admin',
      auditReason: 'Disetujui',
    });

    const [payload] = createSpy.mock.calls[0];
    expect(payload.changedFields).toEqual({
      status: { before: 'calculated', after: 'approved' },
      approvedBy: { before: null, after: 'u-2' },
    });
    expect(payload.changedFields.processedCount).toBeUndefined();
    expect(payload.reason).toBe('Disetujui');
    expect(payload.action).toBe(AuditAction.UPDATE);
  });

  it('afterUpdate: writes nothing when none of the tracked fields actually changed (no-op for this model)', async () => {
    const { model, hooks } = makeModel(['id', 'status']);
    registerAuditLog(model, 'TestEntity', { trackedFields: ['status'] });

    // Only an untracked field changed.
    const instance = makeInstance({ id: 'e-1', status: 'draft' }, [
      'someOtherField',
    ]);
    await hooks.afterUpdate(instance, {});

    expect(createSpy).not.toHaveBeenCalled();
  });

  it('afterDestroy: records every tracked field as {before: value, after: null}', async () => {
    const { model, hooks } = makeModel(['id', 'status']);
    registerAuditLog(model, 'TestEntity', { trackedFields: ['status'] });

    const instance = makeInstance({ id: 'e-1', status: 'draft' });
    await hooks.afterDestroy(instance, { actorId: 'u-1', actorRole: 'admin' });

    const [payload] = createSpy.mock.calls[0];
    expect(payload.action).toBe(AuditAction.DELETE);
    expect(payload.changedFields).toEqual({
      status: { before: 'draft', after: null },
    });
  });

  it('only attaches the hooks requested via the `hooks` option', () => {
    const { model, hooks } = makeModel(['id', 'status']);
    registerAuditLog(model, 'TestEntity', { hooks: ['update'] });

    expect(hooks.afterCreate).toBeUndefined();
    expect(hooks.afterDestroy).toBeUndefined();
    expect(hooks.afterUpdate).toBeDefined();
  });

  it('passes the transaction through so the audit row commits/rolls back atomically with the mutation it describes', async () => {
    const { model, hooks } = makeModel(['id', 'status']);
    registerAuditLog(model, 'TestEntity', { trackedFields: ['status'] });

    const instance = makeInstance({ id: 'e-1', status: 'draft' });
    await hooks.afterCreate(instance, { transaction: 'txn-1' });

    expect(createSpy).toHaveBeenCalledWith(
      expect.anything(),
      { transaction: 'txn-1' },
    );
  });
});
