import { useState } from 'react';
import { Card, DatePicker, Select, Space, Typography } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { useEmployeesQuery } from '../employees/hooks';
import { formatIDR } from '../../components/format';
import { useResolveIncentiveQuery } from './hooks';

// FE-T10, R-13 — same pattern as SalaryResolvePreview: displays whatever the
// backend resolves, never picks a winner itself.
export function IncentiveResolvePreview() {
  const employeesQuery = useEmployeesQuery();
  const [employeeId, setEmployeeId] = useState<string>();
  const [asOf, setAsOf] = useState<Dayjs>(() => dayjs());

  const resolveQuery = useResolveIncentiveQuery(employeeId, asOf.format('YYYY-MM-DD'));

  return (
    <Card size="small" title="Pratinjau Resolusi Insentif" style={{ marginBottom: 16 }}>
      <Space wrap>
        <Select
          placeholder="Pilih karyawan"
          style={{ width: 240 }}
          showSearch
          optionFilterProp="label"
          options={(employeesQuery.data ?? []).map((employee) => ({
            value: employee.id,
            label: employee.name,
          }))}
          value={employeeId}
          onChange={setEmployeeId}
        />
        <DatePicker
          value={asOf}
          onChange={(value) => value && setAsOf(value)}
          format="YYYY-MM-DD"
          allowClear={false}
        />
      </Space>
      {employeeId && (
        <div style={{ marginTop: 12 }}>
          {resolveQuery.isLoading && 'Memuat…'}
          {!resolveQuery.isLoading && resolveQuery.data?.resolved && (
            <Typography.Text>
              {formatIDR(Number(resolveQuery.data.record.incentiveAmount))}{' '}
              <Typography.Text type="secondary">
                (level: {resolveQuery.data.matchedScopeType})
              </Typography.Text>
            </Typography.Text>
          )}
          {!resolveQuery.isLoading && resolveQuery.data && !resolveQuery.data.resolved && (
            <Typography.Text type="secondary">
              Tidak ada aturan insentif yang berlaku untuk kombinasi ini.
            </Typography.Text>
          )}
        </div>
      )}
    </Card>
  );
}
