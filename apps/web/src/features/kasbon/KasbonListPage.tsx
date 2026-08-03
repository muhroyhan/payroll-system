import { useState } from 'react';
import { Button, Progress, Space } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Link } from 'react-router-dom';
import { ListPage } from '../../components/ListPage';
import { StatusTag } from '../../components/StatusTag';
import { formatIDR } from '../../components/format';
import { useServerPagination } from '../../components/useServerPagination';
import { EmployeeSelect } from '../employees/EmployeeSelect';
import { useKasbonListPaginatedQuery } from './hooks';
import { KasbonFormDrawer } from './KasbonFormDrawer';
import { KASBON_STATUS_LABELS } from './labels';
import type { Kasbon } from './api';

// FE-T21 (09_FRONTEND_STEPS.md), §15.11 (08_FRONTEND_STRUCTURE.md). BUGS#2 —
// server-side filter + pagination.
export function KasbonListPage() {
  const [employeeId, setEmployeeId] = useState<string>();
  const { params, onChange, resetToFirstPage } = useServerPagination();
  const query = useKasbonListPaginatedQuery({ ...params, employeeId });
  const [drawerOpen, setDrawerOpen] = useState(false);

  const columns: ColumnsType<Kasbon> = [
    {
      title: 'Karyawan',
      key: 'employee',
      render: (_, record) => (
        <Link to={`/kasbon/${record.id}`}>{record.employee?.name ?? record.employeeId}</Link>
      ),
    },
    { title: 'Jumlah', dataIndex: 'amount', key: 'amount', render: (value: string) => formatIDR(Number(value)) },
    {
      title: 'Status',
      key: 'status',
      render: (_, record) => <StatusTag value={record.status} labels={KASBON_STATUS_LABELS} />,
    },
    {
      title: 'Progres Pelunasan',
      key: 'progress',
      render: (_, record) => {
        if (record.remainingBalance === null) return '—';
        // A ratio of two API-returned fields for display — the same
        // sanctioned pattern as the resolve-preview panels; R-07 still
        // forbids showing a computed "sisa" rupiah figure here.
        const amount = Number(record.amount);
        const remaining = Number(record.remainingBalance);
        const percent = amount > 0 ? Math.round(((amount - remaining) / amount) * 100) : 0;
        return <Progress percent={percent} size="small" />;
      },
    },
    {
      title: 'Aksi',
      key: 'actions',
      render: (_, record) => <Link to={`/kasbon/${record.id}`}>Lihat</Link>,
    },
  ];

  return (
    <>
      <ListPage<Kasbon>
        title="Kasbon"
        primaryAction={
          <Button type="primary" onClick={() => setDrawerOpen(true)}>
            Ajukan Kasbon
          </Button>
        }
        filters={
          <Space>
            <EmployeeSelect
              allowClear
              placeholder="Karyawan"
              style={{ width: 220 }}
              value={employeeId}
              onChange={(value) => {
                setEmployeeId(value);
                resetToFirstPage();
              }}
            />
          </Space>
        }
        query={{ ...query, data: query.data?.items }}
        pagination={{
          current: params.page,
          pageSize: params.limit,
          total: query.data?.total ?? 0,
          onChange,
        }}
        columns={columns}
        rowKey="id"
        emptyDescription="Belum ada kasbon."
      />
      <KasbonFormDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}
