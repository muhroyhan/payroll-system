import type { Transaction } from 'sequelize';

// A Sequelize hook only ever receives (instance, options) — it has no access
// to the HTTP request, so the acting user's id/role can't be re-derived
// inside the hook itself (unlike a NestJS interceptor/guard). Every scoped
// service call site instead threads the actor down explicitly via these
// options, built from the @CurrentUser() the controller already has, e.g.:
//
//   record.update(patch, auditOptions(actor, dto.reason))
//
// registerAuditLog() (./audit-log.util.ts) reads them back off `options` in
// the afterCreate/afterUpdate/afterDestroy hook.
export interface AuditActor {
  id: string;
  role: string;
}

export interface AuditHookOptions {
  // Declared (not set by auditOptions() below) purely so this type has at
  // least one property in common with Sequelize's CreateOptions/
  // InstanceUpdateOptions — otherwise TS's "weak type" check rejects passing
  // this object as a model.create()/record.update() options argument
  // outright, since it would otherwise share zero property names with them.
  // Callers that need a transaction still merge it in themselves, e.g.
  // `{ transaction, ...auditOptions(actor) }`.
  transaction?: Transaction;
  actorId?: string | null;
  actorRole?: string | null;
  auditReason?: string | null;
}

// For the one system-triggered transition in phase-1 scope (the background
// calculation job's draft -> calculated flip, payroll-calculation.processor.ts)
// — there is no @CurrentUser() to thread because no HTTP request is involved.
export const SYSTEM_AUDIT_OPTIONS: AuditHookOptions = {
  actorId: null,
  actorRole: 'system',
  auditReason: null,
};

export function auditOptions(
  actor: AuditActor | null,
  reason?: string | null,
): AuditHookOptions {
  return {
    actorId: actor?.id ?? null,
    actorRole: actor?.role ?? null,
    auditReason: reason ?? null,
  };
}
