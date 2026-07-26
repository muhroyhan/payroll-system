import type { Model, ModelStatic } from 'sequelize';
import { AuditAction } from '@payroll-system/shared-types';
import { AuditEvent } from './entities/audit-event.entity';
import type { AuditHookOptions } from './audit-actor';

const TECHNICAL_FIELDS = new Set(['id', 'createdAt', 'updatedAt']);

export type ChangedFields = Record<string, { before: unknown; after: unknown }>;

export interface RegisterAuditLogOptions {
  // Restrict tracking to these fields only (both the create snapshot and the
  // update diff). Omit to track every non-technical column — appropriate for
  // a rarely-written master row where the whole record matters; pass an
  // explicit list for a high-traffic entity (e.g. PayrollRun, whose
  // processedCount ticks every calculation chunk) so incidental writes don't
  // spam the trail.
  trackedFields?: string[];
  // Which lifecycle hooks to attach. Defaults to all three. Every scoped
  // entity in this phase is "never hard-deleted" (§11) — afterDestroy exists
  // for schema-completeness and future entities, not any current call site.
  hooks?: Array<'create' | 'update' | 'destroy'>;
}

function trackableAttributes(
  model: ModelStatic<Model>,
  trackedFields?: string[],
): string[] {
  const all = Object.keys(model.getAttributes()).filter(
    (field) => !TECHNICAL_FIELDS.has(field),
  );
  return trackedFields ? all.filter((field) => trackedFields.includes(field)) : all;
}

async function writeAuditEvent(
  entityType: string,
  entityId: string,
  action: AuditAction,
  changedFields: ChangedFields,
  hookOptions: AuditHookOptions & { transaction?: unknown },
): Promise<void> {
  // No-op write (e.g. an update() call that touched none of this model's
  // trackedFields) — matches how the *_by columns only get set when the
  // thing they describe actually happened.
  if (Object.keys(changedFields).length === 0) {
    return;
  }
  await AuditEvent.create(
    {
      entityType,
      entityId,
      action,
      actorId: hookOptions?.actorId ?? null,
      actorRole: hookOptions?.actorRole ?? null,
      changedFields,
      reason: hookOptions?.auditReason ?? null,
    } as any,
    { transaction: hookOptions?.transaction as any },
  );
}

// Centralizes "write an audit_events row from a Sequelize hook" so the logic
// isn't duplicated per model. Deliberately opt-in and per-model — called only
// from AuditModule for the phase-1 scope (PayrollRun, the 7 effective-dated
// masters, Employee) — rather than a base class/mixin every entity extends:
// this codebase has no shared base model today (all 38 existing entities
// extend sequelize-typescript's Model directly), and retrofitting one just
// for audit logging would touch every model instead of the ~9 this phase
// covers. Adding a 10th audited entity later is one registerAuditLog() call
// in AuditModule, not a new mixin.
export function registerAuditLog(
  model: ModelStatic<Model>,
  entityType: string,
  options: RegisterAuditLogOptions = {},
): void {
  const hooks = options.hooks ?? ['create', 'update', 'destroy'];

  if (hooks.includes('create')) {
    model.addHook(
      'afterCreate',
      `audit-${entityType}-create`,
      async (instance: any, hookOptions: any) => {
        const fields = trackableAttributes(model, options.trackedFields);
        const changedFields: ChangedFields = {};
        for (const field of fields) {
          changedFields[field] = { before: null, after: instance.get(field) };
        }
        await writeAuditEvent(
          entityType,
          instance.id,
          AuditAction.CREATE,
          changedFields,
          hookOptions,
        );
      },
    );
  }

  if (hooks.includes('update')) {
    model.addHook(
      'afterUpdate',
      `audit-${entityType}-update`,
      async (instance: any, hookOptions: any) => {
        const changed: string[] = instance.changed() || [];
        const fields = trackableAttributes(model, options.trackedFields).filter(
          (field) => changed.includes(field),
        );
        const changedFields: ChangedFields = {};
        for (const field of fields) {
          changedFields[field] = {
            before: instance.previous(field),
            after: instance.get(field),
          };
        }
        await writeAuditEvent(
          entityType,
          instance.id,
          AuditAction.UPDATE,
          changedFields,
          hookOptions,
        );
      },
    );
  }

  if (hooks.includes('destroy')) {
    model.addHook(
      'afterDestroy',
      `audit-${entityType}-delete`,
      async (instance: any, hookOptions: any) => {
        const fields = trackableAttributes(model, options.trackedFields);
        const changedFields: ChangedFields = {};
        for (const field of fields) {
          changedFields[field] = { before: instance.get(field), after: null };
        }
        await writeAuditEvent(
          entityType,
          instance.id,
          AuditAction.DELETE,
          changedFields,
          hookOptions,
        );
      },
    );
  }
}
