import { useState } from 'react';
import { Card, DatePicker, Descriptions, Typography } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { formatIDR } from '../../../components/format';
import { useResolveEffectiveBpjsKesehatanQuery } from './hooks';

// FE-T24, R-13 — shows exactly what GET .../effective returns for the
// chosen date; a 404 (no rate configured for that period) is a normal,
// expected state here, not an error toast.
export function BpjsKesehatanEffectivePreview() {
  const [asOf, setAsOf] = useState<Dayjs>(() => dayjs());
  const query = useResolveEffectiveBpjsKesehatanQuery(asOf.format('YYYY-MM-DD'));

  return (
    <Card size="small" title="Tarif BPJS Kesehatan yang Berlaku" style={{ marginBottom: 16 }}>
      <DatePicker
        value={asOf}
        onChange={(value) => value && setAsOf(value)}
        format="YYYY-MM-DD"
        allowClear={false}
        style={{ marginBottom: 12 }}
      />
      {query.isLoading && <div>Memuat…</div>}
      {query.isError && (
        <Typography.Text type="secondary">
          Belum ada tarif BPJS Kesehatan yang berlaku untuk tanggal ini.
        </Typography.Text>
      )}
      {query.data && (
        <Descriptions size="small" column={1} bordered>
          <Descriptions.Item label="Tarif Karyawan">{query.data.employeeRate}</Descriptions.Item>
          <Descriptions.Item label="Tarif Perusahaan">{query.data.companyRate}</Descriptions.Item>
          <Descriptions.Item label="Batas Upah">
            {formatIDR(Number(query.data.wageCap))}
          </Descriptions.Item>
        </Descriptions>
      )}
    </Card>
  );
}
