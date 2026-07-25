import { useState } from 'react';
import { Button, Select, Space } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Link } from 'react-router-dom';
import { ListPage } from '../../../components/ListPage';
import { StatusTag } from '../../../components/StatusTag';
import { formatDate } from '../../../components/format';
import { useEmployeesQuery } from '../../employees/hooks';
import { useOvertimeLettersQuery } from './hooks';
import { OvertimeLetterFormDrawer } from './OvertimeLetterFormDrawer';
import { OVERTIME_LETTER_STATUS_LABELS } from './labels';
import type { OvertimeLetter } from './api';

// FE-T20 (09_FRONTEND_STEPS.md), §15.10 C.
export function OvertimeLetterListPage() {
  const employeesQuery = useEmployeesQuery();
  const [employeeId, setEmployeeId] = useState<string>();
  const query = useOvertimeLettersQuery(employeeId);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const columns: ColumnsType<OvertimeLetter> = [
    {
      title: 'Karyawan',
      key: 'employee',
      render: (_, record) => (
        <Link to={`/letters/overtime/${record.id}`}>{record.employee?.name ?? record.employeeId}</Link>
      ),
    },
    { title: 'Tanggal', dataIndex: 'date', key: 'date', render: (value: string) => formatDate(value) },
    { title: 'Rencana (jam)', dataIndex: 'plannedOvertimeHours', key: 'plannedOvertimeHours' },
    { title: 'Aktual (jam)', dataIndex: 'actualOvertimeHours', key: 'actualOvertimeHours' },
    {
      title: 'Status',
      key: 'status',
      render: (_, record) => (
        <StatusTag value={record.status} labels={OVERTIME_LETTER_STATUS_LABELS} />
      ),
    },
    {
      title: 'Aksi',
      key: 'actions',
      render: (_, record) => <Link to={`/letters/overtime/${record.id}`}>Lihat</Link>,
    },
  ];

  return (
    <>
      <ListPage<OvertimeLetter>
        title="Surat Lembur"
        primaryAction={
          <Button type="primary" onClick={() => setDrawerOpen(true)}>
            Ajukan Surat Lembur
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
        emptyDescription="Belum ada surat lembur."
      />
      <OvertimeLetterFormDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}
