import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Alert, Descriptions, Modal, Progress, Space, Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PayrollRunStatus } from '@payroll-system/shared-types';
import { formatIDR } from '../../components/format';
import type { PayrollRunExcludedEmployee } from './api';
import { DetailPage } from '../../components/DetailPage';
import { LockedAction } from '../../components/LockedAction';
import { StatusTag } from '../../components/StatusTag';
import { ApiErrorDisplay } from '../../components/ApiErrorDisplay';
import { useAuth } from '../auth/useAuth';
import { describeApiError, type ApiErrorPresentation } from '../../api/errors';
import {
  useApprovePayrollRunMutation,
  useCalculatePayrollRunMutation,
  useDisbursePayrollRunMutation,
  usePayrollRunQuery,
  useRevertPayrollRunMutation,
} from './hooks';
import { PayrollRunStatusSteps } from './PayrollRunStatusSteps';
import { PAYROLL_RUN_STATUS_LABELS } from './labels';

const ADMIN_ONLY_REASON = 'Hanya admin yang dapat melakukan tindakan ini.';

// Task B — mirrors EmployeeImportPage's per-row error table: partial failure
// (here, partial exclusion) is the normal outcome and renders as a table,
// never collapsed into a single toast. HR reads the reason, fixes the
// underlying data (e.g. an oversized kasbon installment), then re-runs
// "Hitung" — a reverted-and-recalculated run re-evaluates every exclusion
// from scratch (payroll-run-revert.service.ts clears stale ones).
const excludedEmployeeColumns: ColumnsType<PayrollRunExcludedEmployee> = [
  {
    title: 'Karyawan',
    key: 'employee',
    render: (_, record) => record.employee?.name ?? record.employeeId,
  },
  { title: 'Alasan', dataIndex: 'reason', key: 'reason' },
  {
    title: 'Gaji Kotor',
    dataIndex: 'grossPay',
    key: 'grossPay',
    render: (value: string) => formatIDR(Number(value)),
  },
  {
    title: 'Take-Home (Negatif)',
    dataIndex: 'netPay',
    key: 'netPay',
    render: (value: string) => formatIDR(Number(value)),
  },
];

// FE-T26/T27/T28 (09_FRONTEND_STEPS.md), §15.12 (08_FRONTEND_STRUCTURE.md).
// All four lifecycle actions are rendered ONLY when the current status
// allows that transition (verified against payroll-run-transitions.ts) —
// this is also why Revert never appears past `calculated`: it isn't
// "disabled because of your role" past that point, the action structurally
// doesn't exist anymore, so it's absent rather than a permanently greyed
// button (per §15.12's design note). Within a valid-for-status action, an
// HR viewer still sees it — just disabled with "Hanya admin", since an
// admin genuinely could act at that stage (R-06a: fully derivable from
// `status` and the current user's role, no server flag needed for this).
export function PayrollRunDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { isAdmin } = useAuth();
  const query = usePayrollRunQuery(id);

  const calculateMutation = useCalculatePayrollRunMutation(id ?? '');
  const approveMutation = useApprovePayrollRunMutation(id ?? '');
  const disburseMutation = useDisbursePayrollRunMutation(id ?? '');
  const revertMutation = useRevertPayrollRunMutation(id ?? '');

  const [actionError, setActionError] = useState<ApiErrorPresentation | null>(null);
  // Bridges the brief window between "202 accepted" and the BullMQ worker
  // actually picking up the job and writing totalCount — the steady-state
  // poll (usePayrollRunQuery's refetchInterval) only activates once
  // totalCount > 0, so without this a fresh click would look inert for a
  // couple of seconds.
  const [awaitingCalculationStart, setAwaitingCalculationStart] = useState(false);

  useEffect(() => {
    if (!awaitingCalculationStart) return;
    const interval = setInterval(() => {
      query.refetch();
    }, 1000);
    return () => clearInterval(interval);
  }, [awaitingCalculationStart, query]);

  useEffect(() => {
    if (!query.data) return;
    if (query.data.totalCount > 0 || query.data.status !== PayrollRunStatus.DRAFT) {
      setAwaitingCalculationStart(false);
    }
  }, [query.data]);

  const record = query.data;
  const isCalculating =
    !!record && record.status === PayrollRunStatus.DRAFT && record.totalCount > 0;

  const runAction = async (action: () => Promise<unknown>) => {
    setActionError(null);
    try {
      await action();
    } catch (err) {
      setActionError(describeApiError(err));
    }
  };

  const handleCalculate = async () => {
    setAwaitingCalculationStart(true);
    await runAction(() => calculateMutation.mutateAsync());
  };

  const handleRevert = () => {
    Modal.confirm({
      title: 'Kembalikan payroll run ke draft?',
      content: (
        <div>
          <p>Tindakan ini akan:</p>
          <ul>
            <li>Menghapus semua payslip dan rincian payslip yang sudah dibuat run ini.</li>
            <li>
              Mengembalikan (rollback) potongan cicilan kasbon yang sudah ditarik oleh run ini —
              saldo kasbon karyawan terkait akan dipulihkan.
            </li>
            <li>Membuka kembali kunci absensi untuk periode ini (dapat diubah lagi).</li>
          </ul>
          <p>Data absensi/komponen sementara periode ini harus dihitung ulang dari awal.</p>
        </div>
      ),
      okText: 'Ya, kembalikan ke draft',
      okButtonProps: { danger: true },
      cancelText: 'Batal',
      onOk: () => runAction(() => revertMutation.mutateAsync()),
    });
  };

  return (
    <>
      <DetailPage
        title={record ? `Payroll Run — ${record.period}` : 'Payroll Run'}
        backTo="/payroll-runs"
        query={query}
        actions={
          record && (
            <Space>
              <Link to={`/payroll-runs/${record.id}/payslips`}>Payslip</Link>
              <Link to={`/payroll-runs/${record.id}/summary`}>Ringkasan</Link>
              {record.status === PayrollRunStatus.DRAFT && (
                <LockedAction
                  type="primary"
                  locked={!isAdmin || isCalculating}
                  reason={!isAdmin ? ADMIN_ONLY_REASON : 'Perhitungan sedang berjalan.'}
                  loading={calculateMutation.isPending || isCalculating}
                  onClick={handleCalculate}
                >
                  Hitung
                </LockedAction>
              )}
              {record.status === PayrollRunStatus.CALCULATED && (
                <LockedAction
                  type="primary"
                  locked={!isAdmin}
                  reason={ADMIN_ONLY_REASON}
                  loading={approveMutation.isPending}
                  onClick={() => runAction(() => approveMutation.mutateAsync())}
                >
                  Setujui
                </LockedAction>
              )}
              {record.status === PayrollRunStatus.APPROVED && (
                <LockedAction
                  type="primary"
                  locked={!isAdmin}
                  reason={ADMIN_ONLY_REASON}
                  loading={disburseMutation.isPending}
                  onClick={() => runAction(() => disburseMutation.mutateAsync())}
                >
                  Cairkan
                </LockedAction>
              )}
              {record.status === PayrollRunStatus.CALCULATED && (
                <LockedAction
                  danger
                  locked={!isAdmin}
                  reason={ADMIN_ONLY_REASON}
                  loading={revertMutation.isPending}
                  onClick={handleRevert}
                >
                  Kembalikan ke Draft
                </LockedAction>
              )}
            </Space>
          )
        }
        renderSummary={(data) => (
          <>
            <PayrollRunStatusSteps status={data.status} />
            {isCalculating && (
              <div style={{ marginTop: 16 }}>
                <Typography.Text>
                  Menghitung… {data.processedCount} dari {data.totalCount} karyawan
                </Typography.Text>
                <Progress
                  percent={
                    data.totalCount > 0
                      ? Math.round((data.processedCount / data.totalCount) * 100)
                      : 0
                  }
                />
                <Typography.Text type="secondary">
                  Jika perhitungan diulang setelah gagal di tengah jalan, progres akan mulai
                  kembali dari awal (bukan melanjutkan) — lihat catatan P8-T04.
                </Typography.Text>
              </div>
            )}
            {!!data.excludedEmployees?.length && (
              <div style={{ marginTop: 16 }}>
                <Alert
                  type="warning"
                  showIcon
                  message={`${data.excludedEmployees.length} karyawan dikecualikan dari perhitungan ini`}
                  description="Karyawan di bawah tetap tidak mendapat payslip pada run ini. Perbaiki data penyebabnya (mis. kurangi potongan kasbon), lalu hitung ulang — run yang dihitung ulang akan mengevaluasi ulang setiap pengecualian dari awal."
                />
                <Table<PayrollRunExcludedEmployee>
                  style={{ marginTop: 12 }}
                  size="small"
                  rowKey="id"
                  columns={excludedEmployeeColumns}
                  dataSource={data.excludedEmployees}
                  pagination={false}
                />
              </div>
            )}
            <Descriptions bordered column={2} size="small" style={{ marginTop: 16 }}>
              <Descriptions.Item label="Periode">{data.period}</Descriptions.Item>
              <Descriptions.Item label="Status">
                <StatusTag value={data.status} labels={PAYROLL_RUN_STATUS_LABELS} />
              </Descriptions.Item>
              <Descriptions.Item label="Dibuat Oleh (User ID)">{data.createdBy}</Descriptions.Item>
              <Descriptions.Item label="Disetujui Oleh (User ID)">
                {data.approvedBy ?? '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Terkunci Sejak" span={2}>
                {data.lockedAt ?? '—'}
              </Descriptions.Item>
            </Descriptions>
          </>
        )}
      />
      <ApiErrorDisplay error={actionError} onDismiss={() => setActionError(null)} />
    </>
  );
}
