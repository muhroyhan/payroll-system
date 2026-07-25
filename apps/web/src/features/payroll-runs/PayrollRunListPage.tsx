import { useState } from 'react';
import { Button, Progress } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Link } from 'react-router-dom';
import { ListPage } from '../../components/ListPage';
import { StatusTag } from '../../components/StatusTag';
import { usePayrollRunsQuery } from './hooks';
import { PayrollRunFormDrawer } from './PayrollRunFormDrawer';
import { PAYROLL_RUN_STATUS_LABELS } from './labels';
import type { PayrollRun } from './api';

// FE-T26 (09_FRONTEND_STEPS.md), §15.12 (08_FRONTEND_STRUCTURE.md).
export function PayrollRunListPage() {
  const query = usePayrollRunsQuery();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const columns: ColumnsType<PayrollRun> = [
    {
      title: 'Periode',
      key: 'period',
      render: (_, record) => <Link to={`/payroll-runs/${record.id}`}>{record.period}</Link>,
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, record) => (
        <StatusTag value={record.status} labels={PAYROLL_RUN_STATUS_LABELS} />
      ),
    },
    {
      title: 'Progres Perhitungan',
      key: 'progress',
      render: (_, record) =>
        record.totalCount > 0 ? (
          <Progress
            percent={Math.round((record.processedCount / record.totalCount) * 100)}
            size="small"
          />
        ) : (
          '—'
        ),
    },
    {
      title: 'Aksi',
      key: 'actions',
      render: (_, record) => <Link to={`/payroll-runs/${record.id}`}>Lihat</Link>,
    },
  ];

  return (
    <>
      <ListPage<PayrollRun>
        title="Payroll Run"
        primaryAction={
          <Button type="primary" onClick={() => setDrawerOpen(true)}>
            Buat Payroll Run
          </Button>
        }
        query={query}
        columns={columns}
        rowKey="id"
        emptyDescription="Belum ada payroll run."
      />
      <PayrollRunFormDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}
