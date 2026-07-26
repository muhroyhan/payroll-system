import { useParams } from 'react-router-dom';
import { Button, Card, Descriptions, Empty, Result, Space, Spin, Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Link } from 'react-router-dom';
import { formatIDR } from '../../components/format';
import { useDownloadPdf } from '../../hooks/useDownloadPdf';
import { describeApiError } from '../../api/errors';
import { usePayrollRunSummaryQuery } from './hooks';
import {
  payrollRunSummaryCsvUrl,
  type PayrollRunDepartmentSummary,
  type PayrollRunSummaryTotals,
} from './api';

type MoneyField = Exclude<keyof PayrollRunSummaryTotals, 'employeeCount'>;

const MONEY_COLUMN_LABELS: Array<[MoneyField, string]> = [
  ['grossPay', 'Gaji Kotor'],
  ['taxableGross', 'Gaji Kena Pajak'],
  ['pph21Amount', 'PPh21'],
  ['bpjsKesehatanEmployee', 'BPJS Kes. (Karyawan)'],
  ['bpjsKesehatanCompany', 'BPJS Kes. (Perusahaan)'],
  ['bpjsJhtEmployee', 'JHT (Karyawan)'],
  ['bpjsJhtCompany', 'JHT (Perusahaan)'],
  ['bpjsJpEmployee', 'JP (Karyawan)'],
  ['bpjsJpCompany', 'JP (Perusahaan)'],
  ['bpjsJkkCompany', 'JKK (Perusahaan)'],
  ['bpjsJkmCompany', 'JKM (Perusahaan)'],
  ['netPay', 'Gaji Bersih'],
];

// FE-T29 (09_FRONTEND_STEPS.md), §15.12 (08_FRONTEND_STRUCTURE.md). Every
// figure here comes straight from GET /:id/summary — PayrollRunSummaryService
// is pure aggregation over already-final payslips (P8-T06); this page must
// not sum/round/derive anything itself (R-07). A draft run's summary 409s
// (no payslips yet) — rendered below as an explanatory empty state per the
// doc's explicit instruction, not the generic QueryStateGuard error panel.
export function PayrollRunSummaryPage() {
  const { id } = useParams<{ id: string }>();
  const query = usePayrollRunSummaryQuery(id);
  const { download, downloading } = useDownloadPdf();

  const columns: ColumnsType<PayrollRunDepartmentSummary> = [
    {
      title: 'Departemen',
      dataIndex: 'departmentName',
      key: 'departmentName',
      fixed: 'left',
    },
    {
      title: 'Jumlah Karyawan',
      dataIndex: 'employeeCount',
      key: 'employeeCount',
    },
    ...MONEY_COLUMN_LABELS.map(([field, label]) => ({
      title: label,
      key: field,
      render: (_: unknown, record: PayrollRunDepartmentSummary) => formatIDR(record[field]),
    })),
  ];

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <Space>
          {id && <Link to={`/payroll-runs/${id}`}>&larr; Kembali</Link>}
          <Typography.Title level={4} style={{ margin: 0 }}>
            Ringkasan Payroll Run
          </Typography.Title>
        </Space>
        {id && (
          <Button
            loading={downloading}
            onClick={() => download(payrollRunSummaryCsvUrl(id), `payroll-run-${id}-summary.csv`)}
          >
            Unduh CSV
          </Button>
        )}
      </div>

      {query.isLoading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
          <Spin size="large" />
        </div>
      )}

      {query.isError &&
        (() => {
          const presentation = describeApiError(query.error);
          if (presentation.kind === 'conflict') {
            return (
              <Empty description="Belum ada payslip — jalankan kalkulasi dulu pada payroll run ini." />
            );
          }
          return (
            <Result
              status={presentation.kind === 'notfound' ? '404' : 'error'}
              title={presentation.title}
              subTitle={presentation.detail}
              extra={
                <Button type="primary" onClick={() => query.refetch()}>
                  Coba Lagi
                </Button>
              }
            />
          );
        })()}

      {query.data &&
        (() => {
          const summary = query.data;
          return (
            <>
              <Card style={{ marginBottom: 16 }}>
                <Descriptions bordered column={3} size="small" title={`Periode ${summary.period}`}>
                  <Descriptions.Item label="Jumlah Karyawan">
                    {summary.totals.employeeCount}
                  </Descriptions.Item>
                  {MONEY_COLUMN_LABELS.map(([field, label]) => (
                    <Descriptions.Item key={field} label={label}>
                      {formatIDR(summary.totals[field])}
                    </Descriptions.Item>
                  ))}
                </Descriptions>
              </Card>
              <Table<PayrollRunDepartmentSummary>
                rowKey={(record) => record.departmentId ?? '__none__'}
                columns={columns}
                dataSource={summary.byDepartment}
                pagination={false}
                scroll={{ x: 'max-content' }}
              />
            </>
          );
        })()}
    </div>
  );
}
