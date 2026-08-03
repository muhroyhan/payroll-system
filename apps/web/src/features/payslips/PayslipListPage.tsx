import { Link, useParams } from 'react-router-dom';
import { Alert } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ListPage } from '../../components/ListPage';
import { formatIDR } from '../../components/format';
import { usePayslipsQuery } from './hooks';
import { PAYSLIP_CORRECTION_GUIDANCE } from './labels';
import type { Payslip } from './api';

// FE-T30 (09_FRONTEND_STEPS.md), §15.13 (08_FRONTEND_STRUCTURE.md). Payslips
// are scoped to one payroll run (GET /payslips?payrollRunId=...); there is
// no cross-run payslip list screen. Read-only by construction — no create/
// edit affordance, matching the backend having no POST/PUT/DELETE.
export function PayslipListPage() {
  const { id } = useParams<{ id: string }>();
  const query = usePayslipsQuery(id);

  const columns: ColumnsType<Payslip> = [
    {
      title: 'Karyawan',
      key: 'employee',
      render: (_, record) => (
        <Link to={`/payslips/${record.id}`}>{record.employee?.name ?? record.employeeId}</Link>
      ),
    },
    {
      title: 'Gaji Kotor',
      key: 'grossPay',
      render: (_, record) => formatIDR(Number(record.grossPay)),
    },
    {
      title: 'PPh21',
      key: 'pph21Amount',
      render: (_, record) => formatIDR(Number(record.pph21Amount)),
    },
    {
      title: 'Gaji Bersih',
      key: 'netPay',
      render: (_, record) => formatIDR(Number(record.netPay)),
    },
    {
      title: 'Aksi',
      key: 'actions',
      render: (_, record) => <Link to={`/payslips/${record.id}`}>Lihat</Link>,
    },
  ];

  return (
    <div>
      {id && (
        <div style={{ marginBottom: 8 }}>
          <Link to={`/payroll-runs/${id}`}>&larr; Kembali ke Payroll Run</Link>
        </div>
      )}
      <Alert style={{ marginBottom: 16 }} type="info" showIcon message={PAYSLIP_CORRECTION_GUIDANCE} />
      <ListPage<Payslip>
        title="Payslip"
        query={query}
        columns={columns}
        rowKey="id"
        emptyDescription="Belum ada payslip — jalankan kalkulasi dulu pada payroll run ini."
      />
    </div>
  );
}
