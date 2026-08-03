import { useMemo, useState, type ReactNode } from 'react';
import { Alert, Checkbox, Space, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ListPage } from './ListPage';
import { formatDate } from './format';

interface EffectiveDatedRecord {
  id: string;
  effectiveStartDate: string;
  effectiveEndDate: string | null;
  // Audit-trail follow-up (§1C) — optional so this stays a drop-in for any
  // future effective-dated master; all 7 current ones set them.
  updatedBy?: string | null;
  // BUGS#19 — eager-loaded (id/name only) by every master's list(); rendered
  // instead of the raw updatedBy id.
  updatedByUser?: { id: string; name: string } | null;
  reason?: string | null;
}

interface EffectiveDatedMasterPageProps<T extends EffectiveDatedRecord> {
  title: string;
  query: {
    data: T[] | undefined;
    isLoading: boolean;
    isError: boolean;
    error: unknown;
    refetch: () => void;
  };
  /** Domain-specific columns; the date-range + status + retire columns are appended here. */
  columns: ColumnsType<T>;
  primaryAction?: ReactNode;
  /** Opens the edit form focused on effectiveEndDate — §11 says "retire",
   *  never delete, so there is deliberately no onDelete prop. */
  onRetire?: (record: T) => void;
  /** Opens the caller's own audit-history Drawer/Modal for this row (see
   *  features/audit-events/AuditHistoryPanel) — kept as a callback rather
   *  than importing that panel directly here, since this file lives in the
   *  generic components/ layer and audit-events is a feature module. */
  onShowHistory?: (record: T) => void;
  /** The GET …/resolve preview panel — its query shape differs per master
   *  (employeeId vs employeeId+leaveTypeId), so the caller builds it. */
  resolvePreview?: ReactNode;
}

function isExpired(record: EffectiveDatedRecord): boolean {
  return !!record.effectiveEndDate && new Date(record.effectiveEndDate) < new Date();
}

// §15.0/§15.5 (08_FRONTEND_STRUCTURE.md) — salary_master, incentive_master,
// leave_policy_master, and every tax/BPJS constant table share this shape:
// no DELETE endpoint exists (§11), a rule is retired via effectiveEndDate,
// and payroll calculation for a past period must keep resolving whatever
// was active *then* — the banner below states that explicitly instead of
// leaving "why can't I delete this" to a 409.
export function EffectiveDatedMasterPage<T extends EffectiveDatedRecord>({
  title,
  query,
  columns,
  primaryAction,
  onRetire,
  onShowHistory,
  resolvePreview,
}: EffectiveDatedMasterPageProps<T>) {
  // FE-T09 — expired rows are tagged (below) but excluded from the default
  // view; a toggle reveals them rather than the list silently growing
  // forever with rules nobody acts on anymore.
  const [showExpired, setShowExpired] = useState(false);

  const filteredData = useMemo(() => {
    if (!query.data) return undefined;
    return showExpired ? query.data : query.data.filter((record) => !isExpired(record));
  }, [query.data, showExpired]);

  const dateColumns: ColumnsType<T> = [
    {
      title: 'Berlaku Sejak',
      dataIndex: 'effectiveStartDate',
      key: 'effectiveStartDate',
      render: (value: string) => formatDate(value),
    },
    {
      title: 'Berlaku Sampai',
      dataIndex: 'effectiveEndDate',
      key: 'effectiveEndDate',
      render: (value: string | null) =>
        value ? formatDate(value) : <Tag color="green">Tidak ditentukan</Tag>,
    },
    {
      title: 'Status',
      key: 'effectiveStatus',
      render: (_, record) =>
        isExpired(record) ? (
          <Tag>Kedaluwarsa</Tag>
        ) : (
          <Tag color="green">Berlaku</Tag>
        ),
    },
    // Audit-trail follow-up (§1C) — who last touched this row, and (when
    // retired) why. BUGS#19 — rendered by name (updatedByUser is eager-loaded
    // by every master's list(), id/name only), not the raw user id.
    {
      title: 'Diubah Oleh',
      key: 'updatedBy',
      render: (_, record) => record.updatedByUser?.name ?? '—',
    },
    {
      title: 'Alasan (jika diakhiri)',
      dataIndex: 'reason',
      key: 'reason',
      render: (value: string | null | undefined) => value ?? '—',
    },
  ];

  const retireColumn: ColumnsType<T> =
    onRetire || onShowHistory
      ? [
          {
            title: 'Aksi',
            key: 'retire',
            render: (_, record) => (
              <Space size="small">
                {/* BUGS#1 — "Ubah", not "Akhiri Masa Berlaku": this just opens
                    the edit form (onRetire === openEdit in every caller); it
                    doesn't retire anything by itself until Berlaku Sampai is
                    actually filled in and saved. */}
                {onRetire && (
                  <Typography.Link onClick={() => onRetire(record)}>Ubah</Typography.Link>
                )}
                {onShowHistory && (
                  <Typography.Link onClick={() => onShowHistory(record)}>
                    Riwayat
                  </Typography.Link>
                )}
              </Space>
            ),
          },
        ]
      : [];

  return (
    <div>
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="Aturan lama tidak bisa dihapus."
        description="Payroll run terdahulu harus tetap bisa direproduksi menggunakan aturan yang berlaku pada periodenya — koreksi dilakukan dengan mengakhiri masa berlaku aturan lama, bukan menghapusnya."
      />
      {resolvePreview}
      <ListPage
        title={title}
        primaryAction={
          <Space>
            <Checkbox
              checked={showExpired}
              onChange={(event) => setShowExpired(event.target.checked)}
            >
              Tampilkan yang kedaluwarsa
            </Checkbox>
            {primaryAction}
          </Space>
        }
        query={{ ...query, data: filteredData }}
        columns={[...columns, ...dateColumns, ...retireColumn]}
        rowKey="id"
      />
    </div>
  );
}
