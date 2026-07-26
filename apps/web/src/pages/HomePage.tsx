import { Link } from 'react-router-dom';
import { Card, Col, Row, Spin, Statistic, Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  KasbonStatus,
  LeaveRequestStatus,
  OvertimeLetterStatus,
  SuratIjinStatus,
} from '@payroll-system/shared-types';
import { StatusTag } from '../components/StatusTag';
import { useLeaveRequestsQuery } from '../features/leave/leave-requests/hooks';
import { useSuratIjinListQuery } from '../features/letters/surat-ijin/hooks';
import { useOvertimeLettersQuery } from '../features/letters/overtime-letters/hooks';
import { useKasbonListQuery } from '../features/kasbon/hooks';
import { usePayrollRunsQuery } from '../features/payroll-runs/hooks';
import { useSalaryPeriodConfigQuery } from '../features/salary-period-config/hooks';
import { PAYROLL_RUN_STATUS_LABELS } from '../features/payroll-runs/labels';
import type { PayrollRun } from '../features/payroll-runs/api';

const RECENT_RUNS_COUNT = 5;

interface KpiTileProps {
  title: string;
  loading: boolean;
  value: number | undefined;
  to: string;
}

function KpiTile({ title, loading, value, to }: KpiTileProps) {
  return (
    <Col xs={24} sm={12} lg={6}>
      <Link to={to}>
        <Card hoverable>
          {loading ? <Spin /> : <Statistic title={title} value={value ?? 0} />}
        </Card>
      </Link>
    </Col>
  );
}

// FE-T32 (09_FRONTEND_STEPS.md), §15.3 (08_FRONTEND_STRUCTURE.md).
// Intentionally thin — composes GET /payroll-runs, GET /leave-requests,
// GET /surat-ijin, GET /overtime-letters, GET /kasbon, and
// GET /salary-period-config via their EXISTING feature hooks (no new API,
// no new query keys). The only arithmetic here is counting rows by status
// client-side and sorting by `period` for "recent" — both explicitly
// permitted by R-07 ("the only arithmetic the frontend may do: counting
// rows..."); no money figure is computed anywhere on this page.
export function HomePage() {
  const leaveRequestsQuery = useLeaveRequestsQuery();
  const suratIjinQuery = useSuratIjinListQuery();
  const overtimeLettersQuery = useOvertimeLettersQuery();
  const kasbonQuery = useKasbonListQuery();
  const payrollRunsQuery = usePayrollRunsQuery();
  const salaryPeriodQuery = useSalaryPeriodConfigQuery();

  const pendingLeaveRequests = leaveRequestsQuery.data?.filter(
    (r) => r.status === LeaveRequestStatus.PENDING,
  ).length;
  const pendingSuratIjin = suratIjinQuery.data?.filter(
    (r) => r.status === SuratIjinStatus.PENDING,
  ).length;
  const pendingOvertimeLetters = overtimeLettersQuery.data?.filter(
    (r) => r.status === OvertimeLetterStatus.PENDING,
  ).length;
  const pendingKasbon = kasbonQuery.data?.filter(
    (r) => r.status === KasbonStatus.PENDING,
  ).length;

  const recentRuns = [...(payrollRunsQuery.data ?? [])]
    .sort((a, b) => b.period.localeCompare(a.period))
    .slice(0, RECENT_RUNS_COUNT);

  const runColumns: ColumnsType<PayrollRun> = [
    {
      title: 'Periode',
      key: 'period',
      render: (_, record) => <Link to={`/payroll-runs/${record.id}`}>{record.period}</Link>,
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, record) => <StatusTag value={record.status} labels={PAYROLL_RUN_STATUS_LABELS} />,
    },
  ];

  // A 404 here means "not configured yet" (see SalaryPeriodConfigPage) — a
  // real first-run state, not an error to surface on the dashboard.
  const salaryPeriodConfigured = !salaryPeriodQuery.isError && !!salaryPeriodQuery.data;

  return (
    <div>
      <Typography.Title level={4}>Beranda</Typography.Title>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <KpiTile
          title="Pengajuan Cuti Menunggu"
          loading={leaveRequestsQuery.isLoading}
          value={pendingLeaveRequests}
          to="/leave/requests"
        />
        <KpiTile
          title="Surat Ijin Menunggu"
          loading={suratIjinQuery.isLoading}
          value={pendingSuratIjin}
          to="/letters/surat-ijin"
        />
        <KpiTile
          title="Surat Lembur Menunggu"
          loading={overtimeLettersQuery.isLoading}
          value={pendingOvertimeLetters}
          to="/letters/overtime"
        />
        <KpiTile
          title="Kasbon Menunggu"
          loading={kasbonQuery.isLoading}
          value={pendingKasbon}
          to="/kasbon"
        />
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Card title="Payroll Run Terbaru">
            <Table<PayrollRun>
              rowKey="id"
              size="small"
              columns={runColumns}
              dataSource={recentRuns}
              loading={payrollRunsQuery.isLoading}
              pagination={false}
              locale={{ emptyText: 'Belum ada payroll run.' }}
            />
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="Periode Gaji">
            {salaryPeriodQuery.isLoading ? (
              <Spin />
            ) : salaryPeriodConfigured ? (
              <>
                <Statistic
                  title="Tanggal Cutoff Absensi"
                  value={salaryPeriodQuery.data!.attendanceCutoffDay}
                />
                <Statistic
                  title="Tanggal Pencairan Gaji"
                  value={salaryPeriodQuery.data!.payrollDisbursementDay}
                  style={{ marginTop: 16 }}
                />
              </>
            ) : (
              <Typography.Text type="secondary">
                Periode gaji belum dikonfigurasi.{' '}
                <Link to="/settings/salary-period">Atur di sini</Link>.
              </Typography.Text>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
