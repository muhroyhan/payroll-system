import { useState } from 'react';
import { Button, Progress, Select, Space } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Link } from 'react-router-dom';
import { ListPage } from '../../components/ListPage';
import { StatusTag } from '../../components/StatusTag';
import { formatIDR } from '../../components/format';
import { useEmployeesQuery } from '../employees/hooks';
import { useKasbonListQuery } from './hooks';
import { KasbonFormDrawer } from './KasbonFormDrawer';
import { KASBON_STATUS_LABELS } from './labels';
import type { Kasbon } from './api';

// FE-T21 (09_FRONTEND_STEPS.md), §15.11 (08_FRONTEND_STRUCTURE.md).
export function KasbonListPage() {
  const employeesQuery = useEmployeesQuery();
  const [employeeId, setEmployeeId] = useState<string>();
  const query = useKasbonListQuery(employeeId);
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
            <Select
              allowClear
              placeholder="Karyawan"
              style={{ width: 220 }}
              showSearch
              optionFilterProp="label"
              options={(employeesQuery.data ?? []).map((employee) => ({
                value: employee.id,
                label: employee.name,
              }))}
              value={employeeId}
              onChange={setEmployeeId}
            />
          </Space>
        }
        query={query}
        columns={columns}
        rowKey="id"
        emptyDescription="Belum ada kasbon."
      />
      <KasbonFormDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}
