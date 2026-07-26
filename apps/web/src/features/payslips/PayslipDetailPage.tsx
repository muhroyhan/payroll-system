import { useParams } from 'react-router-dom';
import { Descriptions, Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Link } from 'react-router-dom';
import { PayslipLineSource } from '@payroll-system/shared-types';
import { DetailPage } from '../../components/DetailPage';
import { LockedAction } from '../../components/LockedAction';
import { formatIDR } from '../../components/format';
import { useDownloadPdf } from '../../hooks/useDownloadPdf';
import { usePayslipQuery } from './hooks';
import { PAYSLIP_LINE_SOURCE_LABELS, PAYSLIP_LINE_SOURCE_LINK_BASE } from './labels';
import type { PayslipLineItem } from './api';

// §15.13 order — the fixed, documented source ordering for the breakdown,
// not an assumption of our own.
const SOURCE_ORDER: PayslipLineSource[] = [
  PayslipLineSource.SALARY_MASTER,
  PayslipLineSource.INCENTIVE_MASTER,
  PayslipLineSource.TEMP_COMPONENT,
  PayslipLineSource.KASBON,
  PayslipLineSource.SANCTION,
  PayslipLineSource.OVERTIME,
  PayslipLineSource.TAX,
  PayslipLineSource.BPJS,
];

// Each table below is already scoped under its group's source label
// (rendered above it), so the source itself isn't repeated per row.
const lineItemColumns: ColumnsType<PayslipLineItem> = [
  {
    title: 'Nominal',
    dataIndex: 'amount',
    key: 'amount',
    render: (value: string) => formatIDR(Number(value)),
  },
  {
    title: 'Referensi',
    key: 'sourceId',
    render: (_, record) => {
      if (!record.sourceId) return '—';
      const base = PAYSLIP_LINE_SOURCE_LINK_BASE[record.source];
      // salary_master/incentive_master/temp_component do have a sourceId,
      // but it points at a master-config row with no per-instance screen —
      // a raw UUID would tell HR staff nothing, so render '—' the same as
      // the genuinely null-sourceId tax/bpjs lines rather than a bare id.
      if (!base) return '—';
      return <Link to={`${base}/${record.sourceId}`}>Lihat sumber</Link>;
    },
  },
];

// FE-T30/FE-T31 (09_FRONTEND_STEPS.md), §15.13 (08_FRONTEND_STRUCTURE.md).
// Read-only audit view — no edit/delete affordance anywhere (§11: payslips
// are CRU-only, and there is no mutation endpoint at all here). Line items
// render grouped by `source` in the doc's fixed order, in the API's original
// relative order within each group — never re-sorted by an assumed category,
// since `component` (which would carry componentType) isn't even eager-
// loaded by GET /payslips/:id.
export function PayslipDetailPage() {
  const { id } = useParams<{ id: string }>();
  const query = usePayslipQuery(id);
  const { download, downloading } = useDownloadPdf();

  const record = query.data;
  const groups = SOURCE_ORDER.map((source) => ({
    source,
    items: record?.lineItems.filter((item) => item.source === source) ?? [],
  })).filter((group) => group.items.length > 0);

  return (
    <DetailPage
      title="Payslip"
      backTo={record ? `/payroll-runs/${record.payrollRunId}/payslips` : undefined}
      query={query}
      actions={
        record && (
          <LockedAction
            locked={!record.pdfPath}
            reason="PDF belum tersedia — sedang dibuat setelah payroll run dihitung."
            loading={downloading}
            onClick={() => download(`/payslips/${record.id}/pdf`, `payslip-${record.id}.pdf`)}
          >
            Unduh PDF
          </LockedAction>
        )
      }
      renderSummary={(data) => (
        <>
          <Descriptions bordered column={2} size="small">
            <Descriptions.Item label="Karyawan">
              {data.employee?.name ?? data.employeeId}
            </Descriptions.Item>
            <Descriptions.Item label="Gaji Kotor">{formatIDR(Number(data.grossPay))}</Descriptions.Item>
            <Descriptions.Item label="Gaji Kena Pajak">
              {formatIDR(Number(data.taxableGross))}
            </Descriptions.Item>
            <Descriptions.Item label="PPh21">{formatIDR(Number(data.pph21Amount))}</Descriptions.Item>
            <Descriptions.Item label="BPJS Kesehatan (Karyawan)">
              {formatIDR(Number(data.bpjsKesehatanEmployee))}
            </Descriptions.Item>
            <Descriptions.Item label="BPJS Kesehatan (Perusahaan)">
              {formatIDR(Number(data.bpjsKesehatanCompany))}
            </Descriptions.Item>
            <Descriptions.Item label="JHT (Karyawan)">
              {formatIDR(Number(data.bpjsJhtEmployee))}
            </Descriptions.Item>
            <Descriptions.Item label="JHT (Perusahaan)">
              {formatIDR(Number(data.bpjsJhtCompany))}
            </Descriptions.Item>
            <Descriptions.Item label="JP (Karyawan)">
              {formatIDR(Number(data.bpjsJpEmployee))}
            </Descriptions.Item>
            <Descriptions.Item label="JP (Perusahaan)">
              {formatIDR(Number(data.bpjsJpCompany))}
            </Descriptions.Item>
            <Descriptions.Item label="JKK (Perusahaan)">
              {formatIDR(Number(data.bpjsJkkCompany))}
            </Descriptions.Item>
            <Descriptions.Item label="JKM (Perusahaan)">
              {formatIDR(Number(data.bpjsJkmCompany))}
            </Descriptions.Item>
            <Descriptions.Item label="Gaji Bersih" span={2}>
              <Typography.Text strong>{formatIDR(Number(data.netPay))}</Typography.Text>
            </Descriptions.Item>
          </Descriptions>

          <Typography.Title level={5} style={{ marginTop: 24 }}>
            Rincian
          </Typography.Title>
          {groups.map((group) => (
            <div key={group.source} style={{ marginBottom: 16 }}>
              <Typography.Text type="secondary">
                {PAYSLIP_LINE_SOURCE_LABELS[group.source].label}
              </Typography.Text>
              <Table<PayslipLineItem>
                size="small"
                rowKey="id"
                columns={lineItemColumns}
                dataSource={group.items}
                pagination={false}
                showHeader={false}
                style={{ marginTop: 4 }}
              />
            </div>
          ))}
        </>
      )}
    />
  );
}
