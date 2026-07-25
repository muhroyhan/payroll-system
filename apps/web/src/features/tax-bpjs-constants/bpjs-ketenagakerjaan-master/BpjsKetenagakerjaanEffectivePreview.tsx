import { useState } from 'react';
import { Card, DatePicker, Descriptions, Typography } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { formatIDR } from '../../../components/format';
import { useResolveEffectiveBpjsKetenagakerjaanQuery } from './hooks';

// FE-T24, R-13 — shows exactly what GET .../effective returns; a 404 is a
// normal "not configured for this period" state, not an error toast.
export function BpjsKetenagakerjaanEffectivePreview() {
  const [asOf, setAsOf] = useState<Dayjs>(() => dayjs());
  const query = useResolveEffectiveBpjsKetenagakerjaanQuery(asOf.format('YYYY-MM-DD'));

  return (
    <Card size="small" title="Tarif BPJS Ketenagakerjaan yang Berlaku" style={{ marginBottom: 16 }}>
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
          Belum ada tarif BPJS Ketenagakerjaan yang berlaku untuk tanggal ini.
        </Typography.Text>
      )}
      {query.data && (
        <Descriptions size="small" column={2} bordered>
          <Descriptions.Item label="JHT — Karyawan">{query.data.jhtEmployeeRate}</Descriptions.Item>
          <Descriptions.Item label="JHT — Perusahaan">{query.data.jhtCompanyRate}</Descriptions.Item>
          <Descriptions.Item label="JP — Karyawan">{query.data.jpEmployeeRate}</Descriptions.Item>
          <Descriptions.Item label="JP — Perusahaan">{query.data.jpCompanyRate}</Descriptions.Item>
          <Descriptions.Item label="JP — Batas Upah">
            {formatIDR(Number(query.data.jpWageCap))}
          </Descriptions.Item>
          <Descriptions.Item label="JKK — Perusahaan">{query.data.jkkCompanyRate}</Descriptions.Item>
          <Descriptions.Item label="JKM — Perusahaan">{query.data.jkmCompanyRate}</Descriptions.Item>
        </Descriptions>
      )}
    </Card>
  );
}
