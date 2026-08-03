import { Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { AuditEntityType } from '@payroll-system/shared-types';
import { QueryStateGuard } from '../../components/QueryStateGuard';
import { StatusTag } from '../../components/StatusTag';
import { formatDateTime } from '../../components/format';
import { useAuditEventsQuery } from './hooks';
import { AUDIT_ACTION_LABELS } from './labels';
import type { AuditEvent } from './api';

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'Ya' : 'Tidak';
  return String(value);
}

const columns: ColumnsType<AuditEvent> = [
  {
    title: 'Waktu',
    dataIndex: 'createdAt',
    key: 'createdAt',
    render: (value: string) => formatDateTime(value),
  },
  {
    title: 'Aksi',
    dataIndex: 'action',
    key: 'action',
    render: (value: AuditEvent['action']) => (
      <StatusTag value={value} labels={AUDIT_ACTION_LABELS} />
    ),
  },
  {
    title: 'Oleh',
    key: 'actor',
    render: (_, record) => {
      if (record.actorRole === 'system') return 'Sistem';
      if (!record.actorId) return '—';
      // BUGS#19 — rendered by name (actor is eager-loaded, id/name only,
      // same as approvedByUser/updatedByUser elsewhere), not the raw id.
      const name = record.actor?.name ?? '—';
      return record.actorRole ? `${name} (${record.actorRole})` : name;
    },
  },
  {
    title: 'Perubahan',
    key: 'changedFields',
    render: (_, record) => (
      <ul style={{ margin: 0, paddingLeft: 16 }}>
        {Object.entries(record.changedFields).map(([field, { before, after }]) => (
          <li key={field}>
            <Typography.Text code>{field}</Typography.Text>: {formatValue(before)} →{' '}
            {formatValue(after)}
          </li>
        ))}
      </ul>
    ),
  },
  {
    title: 'Alasan',
    dataIndex: 'reason',
    key: 'reason',
    render: (value: string | null) => value ?? '—',
  },
];

interface AuditHistoryPanelProps {
  entityType: AuditEntityType;
  entityId: string | undefined;
}

// Generic before/after history viewer — one component reused for every
// audited entity (PayrollRun, the 7 effective-dated masters, Employee) rather
// than a bespoke table per screen. See GET /audit-events (admin-only,
// read-only) and apps/api/src/common/audit for what feeds it.
export function AuditHistoryPanel({ entityType, entityId }: AuditHistoryPanelProps) {
  const query = useAuditEventsQuery(entityType, entityId);
  return (
    <QueryStateGuard
      query={query}
      isEmpty={(data) => data.length === 0}
      emptyDescription="Belum ada histori perubahan."
    >
      {(data) => (
        <Table<AuditEvent>
          rowKey="id"
          size="small"
          columns={columns}
          dataSource={data}
          pagination={false}
        />
      )}
    </QueryStateGuard>
  );
}
