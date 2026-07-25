import { useState } from 'react';
import { Button, Select, Space } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Link } from 'react-router-dom';
import { ListPage } from '../../../components/ListPage';
import { StatusTag } from '../../../components/StatusTag';
import { formatDate } from '../../../components/format';
import { useEmployeesQuery } from '../../employees/hooks';
import { useLeaveRequestsQuery } from './hooks';
import { LeaveRequestFormDrawer } from './LeaveRequestFormDrawer';
import { LEAVE_REQUEST_STATUS_LABELS } from './labels';
import type { LeaveRequest } from './api';

// FE-T14 (09_FRONTEND_STEPS.md), §15.9 (08_FRONTEND_STRUCTURE.md).
export function LeaveRequestListPage() {
  const employeesQuery = useEmployeesQuery();
  const [employeeId, setEmployeeId] = useState<string>();
  const requestsQuery = useLeaveRequestsQuery(employeeId);

  const [drawerOpen, setDrawerOpen] = useState(false);

  const employeeName = (id: string) =>
    employeesQuery.data?.find((employee) => employee.id === id)?.name ?? id;

  const columns: ColumnsType<LeaveRequest> = [
    {
      title: 'Karyawan',
      key: 'employee',
      render: (_, record) => <Link to={`/leave/requests/${record.id}`}>{employeeName(record.employeeId)}</Link>,
    },
    { title: 'Jenis Cuti', key: 'leaveType', render: (_, record) => record.leaveType?.name ?? '—' },
    {
      title: 'Tanggal',
      key: 'dates',
      render: (_, record) => `${formatDate(record.startDate)} — ${formatDate(record.endDate)}`,
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, record) => (
        <StatusTag value={record.status} labels={LEAVE_REQUEST_STATUS_LABELS} />
      ),
    },
    {
      title: 'Aksi',
      key: 'actions',
      // Just a view link — Edit/Delete (locked once decided, R-06a) live on
      // the detail page's action bar, not inline here.
      render: (_, record) => <Link to={`/leave/requests/${record.id}`}>Lihat</Link>,
    },
  ];

  return (
    <>
      <ListPage<LeaveRequest>
        title="Pengajuan Cuti"
        primaryAction={
          <Button type="primary" onClick={() => setDrawerOpen(true)}>
            Ajukan Cuti
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
        query={requestsQuery}
        columns={columns}
        rowKey="id"
        emptyDescription="Belum ada pengajuan cuti."
      />
      <LeaveRequestFormDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}
