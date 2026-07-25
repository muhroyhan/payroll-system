import { useState } from 'react';
import { Button, Select, Space } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Link } from 'react-router-dom';
import { ListPage } from '../../../components/ListPage';
import { StatusTag } from '../../../components/StatusTag';
import { formatDate, formatIDR } from '../../../components/format';
import { useEmployeesQuery } from '../../employees/hooks';
import { useSuratPeringatanListQuery } from './hooks';
import { SuratPeringatanFormDrawer } from './SuratPeringatanFormDrawer';
import { SP_LEVEL_LABELS } from './labels';
import type { SuratPeringatan } from './api';

// FE-T19 (09_FRONTEND_STEPS.md), §15.10 B. No status column — this entity
// has no pending/approved workflow at all (see api.ts's note).
export function SuratPeringatanListPage() {
  const employeesQuery = useEmployeesQuery();
  const [employeeId, setEmployeeId] = useState<string>();
  const query = useSuratPeringatanListQuery(employeeId);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const columns: ColumnsType<SuratPeringatan> = [
    {
      title: 'Karyawan',
      key: 'employee',
      render: (_, record) => (
        <Link to={`/letters/surat-peringatan/${record.id}`}>
          {record.employee?.name ?? record.employeeId}
        </Link>
      ),
    },
    { title: 'Tingkat', key: 'level', render: (_, record) => <StatusTag value={record.level} labels={SP_LEVEL_LABELS} /> },
    { title: 'Tanggal Terbit', dataIndex: 'issueDate', key: 'issueDate', render: (value: string) => formatDate(value) },
    {
      title: 'Sanksi',
      key: 'sanction',
      render: (_, record) =>
        record.sanctionAmount ? formatIDR(Number(record.sanctionAmount)) : '—',
    },
    {
      title: 'Aksi',
      key: 'actions',
      render: (_, record) => <Link to={`/letters/surat-peringatan/${record.id}`}>Lihat</Link>,
    },
  ];

  return (
    <>
      <ListPage<SuratPeringatan>
        title="Surat Peringatan"
        primaryAction={
          <Button type="primary" onClick={() => setDrawerOpen(true)}>
            Terbitkan Surat Peringatan
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
        emptyDescription="Belum ada surat peringatan."
      />
      <SuratPeringatanFormDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}
