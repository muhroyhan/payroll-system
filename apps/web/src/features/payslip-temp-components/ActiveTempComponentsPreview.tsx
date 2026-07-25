import { useState } from 'react';
import { Card, DatePicker, List, Select, Space, Typography } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { useEmployeesQuery } from '../employees/hooks';
import { formatIDR } from '../../components/format';
import { useActivePayslipTempComponentsQuery } from './hooks';

// FE-T23 (09_FRONTEND_STEPS.md), R-13 (07_FRONTEND_RULES.md) — unlike
// salary/incentive's resolve (exactly one winner), more than one temp
// component can be active for the same employee/period simultaneously
// (payroll sums them, per api.ts's note) — this renders the list the
// backend returns as-is, it never picks or reduces to a single value.
export function ActiveTempComponentsPreview() {
  const employeesQuery = useEmployeesQuery();
  const [employeeId, setEmployeeId] = useState<string>();
  const [asOf, setAsOf] = useState<Dayjs>(() => dayjs());

  const activeQuery = useActivePayslipTempComponentsQuery(employeeId, asOf.format('YYYY-MM-DD'));

  return (
    <Card size="small" title="Komponen Sementara Aktif" style={{ marginBottom: 16 }}>
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
          {activeQuery.isLoading && 'Memuat…'}
          {!activeQuery.isLoading && activeQuery.data && activeQuery.data.length === 0 && (
            <Typography.Text type="secondary">
              Tidak ada komponen sementara yang aktif untuk kombinasi ini.
            </Typography.Text>
          )}
          {!activeQuery.isLoading && activeQuery.data && activeQuery.data.length > 0 && (
            <List
              size="small"
              dataSource={activeQuery.data}
              renderItem={(item) => (
                <List.Item>
                  {item.component?.name ?? item.componentId} — {formatIDR(Number(item.amount))}
                </List.Item>
              )}
            />
          )}
        </div>
      )}
    </Card>
  );
}
