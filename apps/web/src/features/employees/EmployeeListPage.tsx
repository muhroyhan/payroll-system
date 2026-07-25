import { useMemo, useState } from 'react';
import { Button, Select, Space } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Link } from 'react-router-dom';
import type { EmployeeActiveStatus } from '@payroll-system/shared-types';
import { ListPage } from '../../components/ListPage';
import { StatusTag } from '../../components/StatusTag';
import { enumSelectOptions } from '../../components/enumSelectOptions';
import { useOrgMasterListQuery } from '../organization/hooks';
import { useEmployeesQuery } from './hooks';
import { EmployeeFormDrawer } from './EmployeeFormDrawer';
import { EMPLOYEE_ACTIVE_STATUS_LABELS } from './labels';
import type { Employee } from './api';

interface EmployeeFilters {
  status?: EmployeeActiveStatus;
  departmentId?: string;
  divisionId?: string;
  positionId?: string;
  employeeTypeId?: string;
}

function toFilterOptions(records: { id: string; name: string }[] | undefined) {
  return (records ?? []).map((record) => ({ value: record.id, label: record.name }));
}

// FE-T06 (09_FRONTEND_STEPS.md), §15.4 (08_FRONTEND_STRUCTURE.md). GET
// /employees has no server-side filter params (verified against
// employees.controller.ts) — filtering here is a client-side view over the
// already-cached list, not a re-fetch per filter change.
export function EmployeeListPage() {
  const employeesQuery = useEmployeesQuery();
  const departmentsQuery = useOrgMasterListQuery('departments');
  const divisionsQuery = useOrgMasterListQuery('divisions');
  const positionsQuery = useOrgMasterListQuery('positions');
  const employeeTypesQuery = useOrgMasterListQuery('employeeTypes');

  const [filters, setFilters] = useState<EmployeeFilters>({});
  const [drawerOpen, setDrawerOpen] = useState(false);

  const filteredData = useMemo(() => {
    if (!employeesQuery.data) return undefined;
    return employeesQuery.data.filter(
      (employee) =>
        (!filters.status || employee.status === filters.status) &&
        (!filters.departmentId || employee.departmentId === filters.departmentId) &&
        (!filters.divisionId || employee.divisionId === filters.divisionId) &&
        (!filters.positionId || employee.positionId === filters.positionId) &&
        (!filters.employeeTypeId || employee.employeeTypeId === filters.employeeTypeId),
    );
  }, [employeesQuery.data, filters]);

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
              onChange={(value) => setFilters((current) => ({ ...current, status: value }))}
            />
            <Select
              allowClear
              placeholder="Jenis Karyawan"
              style={{ width: 180 }}
              options={toFilterOptions(employeeTypesQuery.data)}
              value={filters.employeeTypeId}
              onChange={(value) =>
                setFilters((current) => ({ ...current, employeeTypeId: value }))
              }
            />
            <Select
              allowClear
              placeholder="Posisi"
              style={{ width: 180 }}
              options={toFilterOptions(positionsQuery.data)}
              value={filters.positionId}
              onChange={(value) => setFilters((current) => ({ ...current, positionId: value }))}
            />
            <Select
              allowClear
              placeholder="Departemen"
              style={{ width: 180 }}
              options={toFilterOptions(departmentsQuery.data)}
              value={filters.departmentId}
              onChange={(value) =>
                setFilters((current) => ({ ...current, departmentId: value }))
              }
            />
            <Select
              allowClear
              placeholder="Divisi"
              style={{ width: 180 }}
              options={toFilterOptions(divisionsQuery.data)}
              value={filters.divisionId}
              onChange={(value) => setFilters((current) => ({ ...current, divisionId: value }))}
            />
          </Space>
        }
        query={{ ...employeesQuery, data: filteredData }}
        columns={columns}
        rowKey="id"
        emptyDescription="Belum ada data karyawan."
      />
      <EmployeeFormDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}
