import { useMemo, useState } from 'react';
import { Alert, Button, DatePicker, Popconfirm, Space, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs, { type Dayjs } from 'dayjs';
import { MONTH_LABELS } from '@payroll-system/shared-types';
import { ListPage } from '../../components/ListPage';
import { formatIDR } from '../../components/format';
import { describeApiError } from '../../api/errors';
import { useScopeReferenceData } from '../scope-resolver/useScopeReferenceData';
import { SCOPE_TYPE_LABELS } from '../scope-resolver/labels';
import { usePayslipTempComponentsQuery, useRemovePayslipTempComponentMutation } from './hooks';
import { PayslipTempComponentFormDrawer } from './PayslipTempComponentFormDrawer';
import { ActiveTempComponentsPreview } from './ActiveTempComponentsPreview';
import type { PayslipTempComponent } from './api';

// FE-T23 (09_FRONTEND_STEPS.md), §15.6 (08_FRONTEND_STRUCTURE.md). No lock,
// no period-lock banner (verified against the backend — see api.ts's note):
// this deliberately does NOT mirror attendance records' pattern (FE-T17),
// because payslip_temp_components has no PayrollPeriodLockService check at
// all today. GET /payslip-temp-components also has no server-side filter —
// the period switcher below narrows an already-fully-fetched list, the same
// pattern EmployeeListPage uses, not a required R-08 filter.
export function PayslipTempComponentsPage() {
  const query = usePayslipTempComponentsQuery();
  const removeMutation = useRemovePayslipTempComponentMutation();
  const { labelFor } = useScopeReferenceData();

  const [period, setPeriod] = useState<Dayjs>(() => dayjs());
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<PayslipTempComponent | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const filteredData = useMemo(() => {
    if (!query.data) return undefined;
    return query.data.filter(
      (item) => item.periodYear === period.year() && item.periodMonth === period.month() + 1,
    );
  }, [query.data, period]);

  const openCreate = () => {
    setEditing(null);
    setDrawerOpen(true);
  };

  const openEdit = (record: PayslipTempComponent) => {
    setEditing(record);
    setDrawerOpen(true);
  };

  const handleDelete = async (record: PayslipTempComponent) => {
    setDeleteError(null);
    try {
      await removeMutation.mutateAsync(record.id);
    } catch (err) {
      setDeleteError(describeApiError(err).title);
    }
  };

  const columns: ColumnsType<PayslipTempComponent> = [
    { title: 'Komponen', key: 'component', render: (_, record) => record.component?.name ?? record.componentId },
    {
      title: 'Cakupan',
      key: 'scope',
      render: (_, record) =>
        `${SCOPE_TYPE_LABELS[record.scopeType]} — ${labelFor(record.scopeType, record.scopeValue)}`,
    },
    { title: 'Nominal', dataIndex: 'amount', key: 'amount', render: (value: string) => formatIDR(Number(value)) },
    {
      title: 'Periode',
      key: 'period',
      render: (_, record) => `${MONTH_LABELS[record.periodMonth]} ${record.periodYear}`,
    },
    {
      title: 'Aksi',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Typography.Link onClick={() => openEdit(record)}>Ubah</Typography.Link>
          <Popconfirm title="Hapus komponen sementara ini?" onConfirm={() => handleDelete(record)}>
            <Typography.Link>Hapus</Typography.Link>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      {deleteError && (
        <Alert
          type="error"
          showIcon
          closable
          style={{ marginBottom: 16 }}
          message={deleteError}
          onClose={() => setDeleteError(null)}
        />
      )}
      <ActiveTempComponentsPreview />
      <ListPage<PayslipTempComponent>
        title="Komponen Payslip Sementara"
        primaryAction={
          <Button type="primary" onClick={openCreate}>
            Tambah Komponen Sementara
          </Button>
        }
        filters={
          <Space>
            <DatePicker
              picker="month"
              value={period}
              onChange={(value) => value && setPeriod(value)}
              allowClear={false}
            />
          </Space>
        }
        query={{ ...query, data: filteredData }}
        columns={columns}
        rowKey="id"
        emptyDescription={`Belum ada komponen sementara untuk periode ${period.format('MM/YYYY')}.`}
      />
      <PayslipTempComponentFormDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        tempComponent={editing ?? undefined}
      />
    </div>
  );
}
