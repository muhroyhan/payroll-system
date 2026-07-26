import { Column, DataType, Default, Model, PrimaryKey, Table } from 'sequelize-typescript';
import { AuditAction } from '@payroll-system/shared-types';

// Generic append-only audit trail — before/after value history layered on top
// of (not replacing) the existing per-table actor columns (created_by/
// updated_by/approved_by/disbursed_by/reverted_by/reason). Written ONLY by
// the hooks in ../audit-log.util.ts; there is deliberately no
// service/controller method that updates or deletes a row here (see
// AuditEventsService/Controller — read-only).
@Table({ tableName: 'audit_events', underscored: true, timestamps: true, updatedAt: false })
export class AuditEvent extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  // e.g. 'PayrollRun', 'SalaryMaster' — see AuditEntityType (@payroll-system/shared-types).
  @Column(DataType.STRING)
  declare entityType: string;

  @Column(DataType.UUID)
  declare entityId: string;

  @Column(DataType.ENUM(...Object.values(AuditAction)))
  declare action: AuditAction;

  // Nullable — a system-triggered transition (e.g. the background
  // calculation job's draft -> calculated flip) has no human actor.
  @Column(DataType.UUID)
  declare actorId: string | null;

  // Plain string, not FK'd to the Role enum — a system-triggered event writes
  // 'system' here, which isn't a real Role.
  @Column(DataType.STRING)
  declare actorRole: string | null;

  // { [field]: { before: unknown, after: unknown } } — only the fields that
  // actually changed in this create/update/delete.
  @Column(DataType.JSON)
  declare changedFields: Record<string, { before: unknown; after: unknown }>;

  @Column(DataType.TEXT)
  declare reason: string | null;

  declare readonly createdAt: Date;
}
