import { useState } from 'react';
import { Button, Select, Space } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Link } from 'react-router-dom';
import { ListPage } from '../../components/ListPage';
import { StatusTag } from '../../components/StatusTag';
import { enumSelectOptions } from '../../components/enumSelectOptions';
import { useServerPagination } from '../../components/useServerPagination';
import { useOrgMasterListQuery } from '../organization/hooks';
import { useEmployeesListQuery } from './hooks';
import { EmployeeFormDrawer } from './EmployeeFormDrawer';
import { EMPLOYEE_ACTIVE_STATUS_LABELS } from './labels';
import type { Employee, EmployeeListFilters } from './api';

function toFilterOptions(records: { id: string; name: string }[] | undefined) {
  return (records ?? []).map((record) => ({ value: record.id, label: record.name }));
}

// FE-T06 (09_FRONTEND_STEPS.md), §15.4 (08_FRONTEND_STRUCTURE.md). BUGS#2 —
// server-side filter + pagination (EmployeesController's GET /employees);
// a filter change resets to page 1 (a stale page 3 could be past the end of
// the new, narrower result set).
export function EmployeeListPage() {
  const departmentsQuery = useOrgMasterListQuery('departments');
  const divisionsQuery = useOrgMasterListQuery('divisions');
  const positionsQuery = useOrgMasterListQuery('positions');
  const employeeTypesQuery = useOrgMasterListQuery('employeeTypes');

  const [filters, setFilters] = useState<EmployeeListFilters>({});
  const { params, onChange, resetToFirstPage } = useServerPagination();
  const employeesQuery = useEmployeesListQuery({ ...params, ...filters });
  const setFilter = <K extends keyof EmployeeListFilters>(
    key: K,
    value: EmployeeListFilters[K],
  ) => {
    setFilters((current) => ({ ...current, [key]: value }));
    resetToFirstPage();
  };

  const [drawerOpen, setDrawerOpen] = useState(false);

  const columns: ColumnsType<Employee> = [
    {
      title: 'Nama',
      dataIndex: 'name',
      key: 'name',
      render: (_, record) => <Link to={`/employees/${record.id}`}>{record.name}</Link>,
    },
    { title: 'NIK', dataIndex: 'nik', key: 'nik' },
    {
      title: 'Jenis Karyawan',
      key: 'employeeType',
      render: (_, record) => record.employeeType?.name ?? '—',
    },
    { title: 'Posisi', key: 'position', render: (_, record) => record.position?.name ?? '—' },
    {
      title: 'Departemen',
      key: 'department',
      render: (_, record) => record.department?.name ?? '—',
    },
    { title: 'Divisi', key: 'division', render: (_, record) => record.division?.name ?? '—' },
    {
      title: 'Status',
      key: 'status',
      render: (_, record) => (
        <StatusTag value={record.status} labels={EMPLOYEE_ACTIVE_STATUS_LABELS} />
      ),
    },
  ];

  return (
    <>
      <ListPage<Employee>
        title="Karyawan"
        primaryAction={
          <Space>
            <Link to="/employees/import">
              <Button>Impor</Button>
            </Link>
            <Button type="primary" onClick={() => setDrawerOpen(true)}>
              Tambah Karyawan
            </Button>
          </Space>
        }
        filters={
          <Space wrap>
            <Select
              allowClear
              placeholder="Status"
              style={{ width: 160 }}
              options={enumSelectOptions(EMPLOYEE_ACTIVE_STATUS_LABELS)}
              value={filters.status}
              onChange={(value) => setFilter('status', value)}
            />
            <Select
              allowClear
              placeholder="Jenis Karyawan"
              style={{ width: 180 }}
              options={toFilterOptions(employeeTypesQuery.data)}
              value={filters.employeeTypeId}
              onChange={(value) => setFilter('employeeTypeId', value)}
            />
            <Select
              allowClear
              placeholder="Posisi"
              style={{ width: 180 }}
              options={toFilterOptions(positionsQuery.data)}
              value={filters.positionId}
              onChange={(value) => setFilter('positionId', value)}
            />
            <Select
              allowClear
              placeholder="Departemen"
              style={{ width: 180 }}
              options={toFilterOptions(departmentsQuery.data)}
              value={filters.departmentId}
              onChange={(value) => setFilter('departmentId', value)}
            />
            <Select
              allowClear
              placeholder="Divisi"
              style={{ width: 180 }}
              options={toFilterOptions(divisionsQuery.data)}
              value={filters.divisionId}
              onChange={(value) => setFilter('divisionId', value)}
            />
          </Space>
        }
        query={{
          ...employeesQuery,
          data: employeesQuery.data?.items,
        }}
        pagination={{
          current: params.page,
          pageSize: params.limit,
          total: employeesQuery.data?.total ?? 0,
          onChange,
        }}
        columns={columns}
        rowKey="id"
        emptyDescription="Belum ada data karyawan."
      />
      <EmployeeFormDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}
