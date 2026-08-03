import { useState } from 'react';
import { Button, Space } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Link } from 'react-router-dom';
import { ListPage } from '../../../components/ListPage';
import { StatusTag } from '../../../components/StatusTag';
import { formatDate } from '../../../components/format';
import { useServerPagination } from '../../../components/useServerPagination';
import { useEmployeesQuery } from '../../employees/hooks';
import { EmployeeSelect } from '../../employees/EmployeeSelect';
import { useLeaveRequestsPaginatedQuery } from './hooks';
import { LeaveRequestFormDrawer } from './LeaveRequestFormDrawer';
import { LEAVE_REQUEST_STATUS_LABELS } from './labels';
import type { LeaveRequest } from './api';

// FE-T14 (09_FRONTEND_STEPS.md), §15.9 (08_FRONTEND_STRUCTURE.md). BUGS#2 —
// server-side filter + pagination.
export function LeaveRequestListPage() {
  const employeesQuery = useEmployeesQuery();
  const [employeeId, setEmployeeId] = useState<string>();
  const { params, onChange, resetToFirstPage } = useServerPagination();
  const requestsQuery = useLeaveRequestsPaginatedQuery({ ...params, employeeId });

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
        query={{ ...requestsQuery, data: requestsQuery.data?.items }}
        pagination={{
          current: params.page,
          pageSize: params.limit,
          total: requestsQuery.data?.total ?? 0,
          onChange,
        }}
        columns={columns}
        rowKey="id"
        emptyDescription="Belum ada pengajuan cuti."
      />
      <LeaveRequestFormDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}
