import { useMemo, useState } from 'react';
import { Alert, DatePicker, Drawer, Select, Space, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Link } from 'react-router-dom';
import dayjs, { type Dayjs } from 'dayjs';
import { AuditEntityType } from '@payroll-system/shared-types';
import { ListPage } from '../../../components/ListPage';
import { LockedAction } from '../../../components/LockedAction';
import { StatusTag } from '../../../components/StatusTag';
import { formatDate } from '../../../components/format';
import { useEmployeesQuery } from '../../employees/hooks';
import { usePayrollRunsQuery } from '../../payroll-runs/hooks';
import { findLockingRun } from '../../payroll-runs/periodLock';
import { PAYROLL_RUN_STATUS_LABELS } from '../../payroll-runs/labels';
import { AuditHistoryPanel } from '../../audit-events/AuditHistoryPanel';
import { useAttendanceRecordsQuery } from './hooks';
import { AttendanceManualEntryDrawer } from './AttendanceManualEntryDrawer';
import { ReconcileDrawer } from './ReconcileDrawer';
import { ATTENDANCE_SOURCE_LABELS } from './labels';
import type { AttendanceRecord } from './api';

function formatTime(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

// FE-T17 (09_FRONTEND_STEPS.md), §15.8 C (08_FRONTEND_STRUCTURE.md) — the
// headline deliverable of this task is the period-lock banner below, not
// the list itself. §11/TC-PAYROLL-04: source data for a period whose
// payroll run is past `draft` is locked until the run is reverted.
export function AttendanceRecordsPage() {
  const employeesQuery = useEmployeesQuery();
  const [employeeId, setEmployeeId] = useState<string>();
  const [month, setMonth] = useState<Dayjs>(() => dayjs());

  const from = month.startOf('month').format('YYYY-MM-DD');
  const to = month.endOf('month').format('YYYY-MM-DD');
  const period = month.format('YYYY-MM');

  const recordsQuery = useAttendanceRecordsQuery(employeeId, from, to);
  // Cached under ['payroll-runs'] — reused as-is by the payroll-runs screens
  // once they land (FE-T26+), not a second fetch of the same data.
  const payrollRunsQuery = usePayrollRunsQuery();
  const lockingRun = useMemo(
    () => findLockingRun(period, payrollRunsQuery.data),
    [period, payrollRunsQuery.data],
  );

  const [manualEntryOpen, setManualEntryOpen] = useState(false);
  const [reconcileOpen, setReconcileOpen] = useState(false);
  const [historyRecord, setHistoryRecord] = useState<AttendanceRecord | null>(null);

  const employeeName = (id: string) =>
    employeesQuery.data?.find((employee) => employee.id === id)?.name ?? id;

  const lockReason = lockingRun
    ? `Periode ${period} terkunci — payroll run sudah ${PAYROLL_RUN_STATUS_LABELS[lockingRun.status].label}. Kembalikan run ke draft dulu untuk mengubah absensi periode ini.`
    : undefined;

  const columns: ColumnsType<AttendanceRecord> = [
    { title: 'Karyawan', key: 'employee', render: (_, record) => employeeName(record.employeeId) },
    { title: 'Tanggal', dataIndex: 'date', key: 'date', render: (value: string) => formatDate(value) },
    { title: 'Jam Masuk', dataIndex: 'clockIn', key: 'clockIn', render: formatTime },
    { title: 'Jam Keluar', dataIndex: 'clockOut', key: 'clockOut', render: formatTime },
    { title: 'Lembur (jam)', dataIndex: 'overtimeHours', key: 'overtimeHours' },
    {
      title: 'Penanda',
      key: 'flags',
      render: (_, record) => (
        <Space size={4} wrap>
          {record.isHoliday && <Tag color="red">Libur</Tag>}
          {record.isOnLeave && <Tag color="blue">Cuti</Tag>}
          {record.hasPermission && <Tag color="gold">Izin</Tag>}
          {record.hasMissedClockOut && <Tag color="volcano">Tidak Lengkap</Tag>}
        </Space>
      ),
    },
    {
      // §5.3/§11 — always shown; decides overwrite precedence when a
      // different source writes the same day.
      title: 'Sumber',
      key: 'source',
      render: (_, record) => <StatusTag value={record.source} labels={ATTENDANCE_SOURCE_LABELS} />,
    },
    // Audit-trail follow-up (§D) — raw user ids, not resolved to a name here
    // (same reasoning as updatedBy elsewhere — GET /users is admin-only).
    {
      title: 'Dientri Oleh (Manual)',
      dataIndex: 'enteredBy',
      key: 'enteredBy',
      render: (value: string | null) => value ?? '—',
    },
    {
      title: 'Ditimpa Oleh',
      dataIndex: 'overwrittenBy',
      key: 'overwrittenBy',
      render: (value: string | null) => value ?? '—',
    },
    {
      title: 'Aksi',
      key: 'history',
      render: (_, record) => (
        <Typography.Link onClick={() => setHistoryRecord(record)}>Riwayat</Typography.Link>
      ),
    },
  ];

  return (
    <div>
      <Typography.Title level={4}>Rekap Absensi</Typography.Title>

      {lockingRun && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          message={`Periode ${period} terkunci`}
          description={
            <>
              {lockReason}{' '}
              <Link to={`/payroll-runs/${lockingRun.id}`}>Lihat payroll run ini</Link>.
            </>
          }
        />
      )}

      <ListPage<AttendanceRecord>
        title="Data Absensi"
        primaryAction={
          <Space>
            {/* R-06a — every write control is disabled with the same
                reason while the period is locked; all three (reconcile,
                manual entry, CSV import) share this rule. There is no CSV
                import screen for attendance-records in this task — see
                09_FRONTEND_STEPS.md FE-T17. */}
            <LockedAction locked={!!lockingRun} reason={lockReason} onClick={() => setReconcileOpen(true)}>
              Rekonsiliasi
            </LockedAction>
            <LockedAction
              locked={!!lockingRun}
              reason={lockReason}
              type="primary"
              onClick={() => setManualEntryOpen(true)}
            >
              Tambah Manual
            </LockedAction>
          </Space>
        }
        filters={
          <Space wrap>
            <DatePicker
              picker="month"
              value={month}
              onChange={(value) => value && setMonth(value)}
              allowClear={false}
            />
            <Select
              allowClear
              placeholder="Karyawan"
              style={{ width: 220 }}
              showSearch
              optionFilterProp="label"
              options={(employeesQuery.data ?? []).map((employee) => ({
                value: employee.id,
                label: employee.name,
              }))}
              value={employeeId}
              onChange={setEmployeeId}
            />
          </Space>
        }
        query={recordsQuery}
        columns={columns}
        rowKey="id"
        emptyDescription={`Belum ada data absensi untuk periode ${period}.`}
      />

      <AttendanceManualEntryDrawer open={manualEntryOpen} onClose={() => setManualEntryOpen(false)} />
      <ReconcileDrawer open={reconcileOpen} onClose={() => setReconcileOpen(false)} />
      <Drawer
        title="Histori Perubahan"
        open={!!historyRecord}
        onClose={() => setHistoryRecord(null)}
        width={640}
      >
        {historyRecord && (
          <AuditHistoryPanel
            entityType={AuditEntityType.ATTENDANCE_RECORD}
            entityId={historyRecord.id}
          />
        )}
      </Drawer>
    </div>
  );
}
