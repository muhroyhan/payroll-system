import { useState } from 'react';
import { Card, DatePicker, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs, { type Dayjs } from 'dayjs';
import { formatIDR } from '../../../components/format';
import { StatusTag } from '../../../components/StatusTag';
import { PTKP_STATUS_LABELS } from '../../employees/labels';
import { useResolveEffectivePtkpQuery } from './hooks';
import type { PtkpMaster } from './api';

const columns: ColumnsType<PtkpMaster> = [
  {
    title: 'Status PTKP',
    key: 'ptkpStatus',
    render: (_, record) => <StatusTag value={record.ptkpStatus} labels={PTKP_STATUS_LABELS} />,
  },
  { title: 'Nominal', dataIndex: 'amount', key: 'amount', render: (value: string) => formatIDR(Number(value)) },
];

// FE-T24 (09_FRONTEND_STEPS.md), R-13 (07_FRONTEND_RULES.md) — shows exactly
// what GET .../effective returns for the chosen date (one row per PTKP
// status that has a currently-effective rule); never picks a row itself.
export function PtkpEffectivePreview() {
  const [asOf, setAsOf] = useState<Dayjs>(() => dayjs());
  const query = useResolveEffectivePtkpQuery(asOf.format('YYYY-MM-DD'));

  return (
    <Card size="small" title="Nominal PTKP yang Berlaku" style={{ marginBottom: 16 }}>
      <DatePicker
        value={asOf}
        onChange={(value) => value && setAsOf(value)}
        format="YYYY-MM-DD"
        allowClear={false}
        style={{ marginBottom: 12 }}
      />
      <Table<PtkpMaster>
        size="small"
        rowKey="id"
        columns={columns}
        dataSource={query.data ?? []}
        loading={query.isLoading}
        pagination={false}
      />
    </Card>
  );
}
