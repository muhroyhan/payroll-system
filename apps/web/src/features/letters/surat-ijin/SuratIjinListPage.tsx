import { useState } from 'react';
import { Button, Space } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Link } from 'react-router-dom';
import { ListPage } from '../../../components/ListPage';
import { StatusTag } from '../../../components/StatusTag';
import { formatDate } from '../../../components/format';
import { EmployeeSelect } from '../../employees/EmployeeSelect';
import { useSuratIjinListQuery } from './hooks';
import { SuratIjinFormDrawer } from './SuratIjinFormDrawer';
import { SURAT_IJIN_STATUS_LABELS, SURAT_IJIN_TYPE_LABELS } from './labels';
import type { SuratIjin } from './api';

// FE-T18 (09_FRONTEND_STEPS.md), §15.10 A.
export function SuratIjinListPage() {
  const [employeeId, setEmployeeId] = useState<string>();
  const query = useSuratIjinListQuery(employeeId);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const columns: ColumnsType<SuratIjin> = [
    {
      title: 'Karyawan',
      key: 'employee',
      render: (_, record) => (
        <Link to={`/letters/surat-ijin/${record.id}`}>{record.employee?.name ?? record.employeeId}</Link>
      ),
    },
    { title: 'Jenis', key: 'type', render: (_, record) => <StatusTag value={record.type} labels={SURAT_IJIN_TYPE_LABELS} /> },
    { title: 'Tanggal', dataIndex: 'date', key: 'date', render: (value: string) => formatDate(value) },
    { title: 'Jam', dataIndex: 'timeRequested', key: 'timeRequested' },
    {
      title: 'Status',
      key: 'status',
      render: (_, record) => <StatusTag value={record.status} labels={SURAT_IJIN_STATUS_LABELS} />,
    },
    {
      title: 'Aksi',
      key: 'actions',
      render: (_, record) => <Link to={`/letters/surat-ijin/${record.id}`}>Lihat</Link>,
    },
  ];

  return (
    <>
      <ListPage<SuratIjin>
        title="Surat Ijin"
        primaryAction={
          <Button type="primary" onClick={() => setDrawerOpen(true)}>
            Ajukan Surat Ijin
          </Button>
        }
        filters={
          <Space>
            <EmployeeSelect
              allowClear
              placeholder="Karyawan"
              style={{ width: 220 }}
              value={employeeId}
              onChange={setEmployeeId}
            />
          </Space>
        }
        query={query}
        columns={columns}
        rowKey="id"
        emptyDescription="Belum ada surat ijin."
      />
      <SuratIjinFormDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}
