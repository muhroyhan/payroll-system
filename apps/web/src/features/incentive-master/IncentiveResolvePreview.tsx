import { useState } from 'react';
import { Card, DatePicker, Space, Typography } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { EmployeeSelect } from '../employees/EmployeeSelect';
import { formatIDR } from '../../components/format';
import { useResolveIncentiveQuery } from './hooks';

// FE-T10, R-13 — same pattern as SalaryResolvePreview: displays whatever the
// backend resolves, never picks a winner itself.
export function IncentiveResolvePreview() {
  const [employeeId, setEmployeeId] = useState<string>();
  const [asOf, setAsOf] = useState<Dayjs>(() => dayjs());

  const resolveQuery = useResolveIncentiveQuery(employeeId, asOf.format('YYYY-MM-DD'));

  return (
    <Card size="small" title="Pratinjau Resolusi Insentif" style={{ marginBottom: 16 }}>
      <Space wrap>
        <EmployeeSelect
          placeholder="Pilih karyawan"
          style={{ width: 240 }}
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
