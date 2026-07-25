import { useState } from 'react';
import { Card, DatePicker, Select, Space, Typography } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { useEmployeesQuery } from '../../employees/hooks';
import { useLeaveTypesQuery } from '../leave-types/hooks';
import { useResolveLeavePolicyQuery } from './hooks';

// FE-T12, R-13 (07_FRONTEND_RULES.md) — same pattern as Salary/Incentive
// resolve previews: shows whatever GET …/resolve returns for the chosen
// employee + leave type + date, never picks a winner itself.
export function LeavePolicyResolvePreview() {
  const employeesQuery = useEmployeesQuery();
  const leaveTypesQuery = useLeaveTypesQuery();
  const [employeeId, setEmployeeId] = useState<string>();
  const [leaveTypeId, setLeaveTypeId] = useState<string>();
  const [asOf, setAsOf] = useState<Dayjs>(() => dayjs());

  const resolveQuery = useResolveLeavePolicyQuery(
    employeeId,
    leaveTypeId,
    asOf.format('YYYY-MM-DD'),
  );

  return (
    <Card size="small" title="Pratinjau Resolusi Kebijakan Cuti" style={{ marginBottom: 16 }}>
      <Space wrap>
        <Select
          placeholder="Pilih karyawan"
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
        <Select
          placeholder="Pilih jenis cuti"
          style={{ width: 180 }}
          options={(leaveTypesQuery.data ?? []).map((type) => ({
            value: type.id,
            label: type.name,
          }))}
          value={leaveTypeId}
          onChange={setLeaveTypeId}
        />
        <DatePicker
          value={asOf}
          onChange={(value) => value && setAsOf(value)}
          format="YYYY-MM-DD"
          allowClear={false}
        />
      </Space>
      {employeeId && leaveTypeId && (
        <div style={{ marginTop: 12 }}>
          {resolveQuery.isLoading && 'Memuat…'}
          {!resolveQuery.isLoading && resolveQuery.data?.resolved && (
            <Typography.Text>
              {resolveQuery.data.record.annualQuota} hari/tahun{' '}
              <Typography.Text type="secondary">
                (level: {resolveQuery.data.matchedScopeType})
              </Typography.Text>
            </Typography.Text>
          )}
          {!resolveQuery.isLoading && resolveQuery.data && !resolveQuery.data.resolved && (
            <Typography.Text type="secondary">
              Tidak ada kebijakan cuti yang berlaku untuk kombinasi ini.
            </Typography.Text>
          )}
        </div>
      )}
    </Card>
  );
}
