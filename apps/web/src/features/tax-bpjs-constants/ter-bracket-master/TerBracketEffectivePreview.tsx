import { useState } from 'react';
import { Card, DatePicker, Select, Space, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs, { type Dayjs } from 'dayjs';
import type { TerCategory } from '@payroll-system/shared-types';
import { formatIDR } from '../../../components/format';
import { StatusTag } from '../../../components/StatusTag';
import { enumSelectOptions } from '../../../components/enumSelectOptions';
import { TER_CATEGORY_LABELS } from './labels';
import { useResolveEffectiveTerBracketsQuery } from './hooks';
import type { TerBracketMaster } from './api';

const columns: ColumnsType<TerBracketMaster> = [
  {
    title: 'Kategori',
    key: 'terCategory',
    render: (_, record) => <StatusTag value={record.terCategory} labels={TER_CATEGORY_LABELS} />,
  },
  {
    title: 'Batas Bawah',
    dataIndex: 'incomeLowerBound',
    key: 'incomeLowerBound',
    render: (value: string) => formatIDR(Number(value)),
  },
  {
    title: 'Batas Atas',
    dataIndex: 'incomeUpperBound',
    key: 'incomeUpperBound',
    render: (value: string | null) => (value ? formatIDR(Number(value)) : 'Tidak terbatas'),
  },
  { title: 'Tarif (fraksi)', dataIndex: 'rate', key: 'rate' },
];

// FE-T24, R-13 — shows exactly what GET .../effective returns; never
// re-derives a bracket lookup client-side (that logic is the tax engine's,
// not the frontend's, per §3/R-13).
export function TerBracketEffectivePreview() {
  const [asOf, setAsOf] = useState<Dayjs>(() => dayjs());
  const [category, setCategory] = useState<TerCategory>();
  const query = useResolveEffectiveTerBracketsQuery(asOf.format('YYYY-MM-DD'), category);

  return (
    <Card size="small" title="Bracket TER yang Berlaku" style={{ marginBottom: 16 }}>
      <Space style={{ marginBottom: 12 }}>
        <DatePicker
          value={asOf}
          onChange={(value) => value && setAsOf(value)}
          format="YYYY-MM-DD"
          allowClear={false}
        />
        <Select
          allowClear
          placeholder="Semua kategori"
          style={{ width: 160 }}
          options={enumSelectOptions(TER_CATEGORY_LABELS)}
          value={category}
          onChange={setCategory}
        />
      </Space>
      <Table<TerBracketMaster>
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
