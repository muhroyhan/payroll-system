import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button, Descriptions, Typography } from 'antd';
import { AuditEntityType } from '@payroll-system/shared-types';
import { DetailPage } from '../../components/DetailPage';
import { StatusTag } from '../../components/StatusTag';
import { formatDate, formatIDR } from '../../components/format';
import { useEmployeeQuery } from './hooks';
import { useResolveSalaryQuery } from '../salary-master/hooks';
import { useAuth } from '../auth/useAuth';
import { AuditHistoryPanel } from '../audit-events/AuditHistoryPanel';
import { EmployeeFormDrawer } from './EmployeeFormDrawer';
import {
  EMPLOYEE_ACTIVE_STATUS_LABELS,
  EMPLOYMENT_STATUS_LABELS,
  GENDER_LABELS,
  MARITAL_STATUS_LABELS,
  PTKP_STATUS_LABELS,
} from './labels';

// FE-T06 (09_FRONTEND_STEPS.md), §15.4 (08_FRONTEND_STRUCTURE.md). No delete
// action — /employees has no DELETE endpoint (§11); deactivation happens via
// the `status` field inside the same edit drawer used here.
export function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { isAdmin } = useAuth();
  const employeeQuery = useEmployeeQuery(id);
  const salaryQuery = useResolveSalaryQuery(id);
  const [editOpen, setEditOpen] = useState(false);

  return (
    <>
      <DetailPage
        title={employeeQuery.data?.name ?? 'Karyawan'}
        backTo="/employees"
        query={employeeQuery}
        // GET /audit-events is admin-only — only ptkpManuallyOverridden is
        // tracked for Employee (phase-1 scope), but the tab is generic.
        tabs={
          isAdmin && employeeQuery.data
            ? [
                {
                  key: 'audit-history',
                  label: 'Histori Perubahan',
                  children: (
                    <AuditHistoryPanel
                      entityType={AuditEntityType.EMPLOYEE}
                      entityId={employeeQuery.data.id}
                    />
                  ),
                },
              ]
            : undefined
        }
        actions={
          <Button type="primary" onClick={() => setEditOpen(true)}>
            Ubah
          </Button>
        }
        renderSummary={(employee) => (
          <Descriptions bordered column={2} size="small">
            <Descriptions.Item label="NIK">{employee.nik}</Descriptions.Item>
            <Descriptions.Item label="NPWP">{employee.npwp ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="Status Kepegawaian">
              <StatusTag value={employee.employmentStatus} labels={EMPLOYMENT_STATUS_LABELS} />
            </Descriptions.Item>
            <Descriptions.Item label="Status Karyawan">
              <StatusTag value={employee.status} labels={EMPLOYEE_ACTIVE_STATUS_LABELS} />
            </Descriptions.Item>
            <Descriptions.Item label="Status Pernikahan">
              <StatusTag value={employee.maritalStatus} labels={MARITAL_STATUS_LABELS} />
            </Descriptions.Item>
            <Descriptions.Item label="Jenis Kelamin">
              {employee.gender ? (
                <StatusTag value={employee.gender} labels={GENDER_LABELS} />
              ) : (
                '—'
              )}
            </Descriptions.Item>
            <Descriptions.Item label="Jumlah Tanggungan">
              {employee.dependentCount}
            </Descriptions.Item>
            <Descriptions.Item label="Status PTKP">
              {/* Server-derived (§5.1a) — never recomputed client-side, R-10. */}
              <StatusTag value={employee.ptkpStatus} labels={PTKP_STATUS_LABELS} />
              {employee.ptkpManuallyOverridden && (
                <Typography.Text type="secondary">
                  {' '}
                  (ditimpa manual{employee.ptkpOverriddenReason
                    ? ` — alasan: ${employee.ptkpOverriddenReason}`
                    : ''}
                  )
                </Typography.Text>
              )}
            </Descriptions.Item>
            <Descriptions.Item label="Jenis Karyawan">
              {employee.employeeType?.name ?? '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Posisi">{employee.position?.name ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="Departemen">
              {employee.department?.name ?? '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Divisi">{employee.division?.name ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="Lokasi">{employee.location ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="Tanggal Mulai">
              {formatDate(employee.startDate)}
            </Descriptions.Item>
            <Descriptions.Item label="Tanggal Selesai">
              {employee.endDate ? formatDate(employee.endDate) : '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Bank" span={2}>
              {employee.bankName
                ? `${employee.bankName} — ${employee.bankAccountNumber ?? '—'} a.n. ${
                    employee.bankAccountHolderName ?? '—'
                  }`
                : '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Gaji Pokok (hasil Master Gaji)" span={2}>
              {/* §5.2 — base_salary is not an employee field; this is the
                  resolved value from GET /salary-master/resolve, read-only,
                  labeled with the winning scope level (R-13: never picked
                  client-side). */}
              {salaryQuery.isLoading && 'Memuat…'}
              {!salaryQuery.isLoading && salaryQuery.data?.resolved && (
                <>
                  {formatIDR(Number(salaryQuery.data.record.baseSalary))}{' '}
                  <Typography.Text type="secondary">
                    (level: {salaryQuery.data.matchedScopeType})
                  </Typography.Text>
                </>
              )}
              {!salaryQuery.isLoading && salaryQuery.data && !salaryQuery.data.resolved && (
                <Typography.Text type="secondary">
                  Belum ada aturan gaji yang berlaku untuk karyawan ini.
                </Typography.Text>
              )}
            </Descriptions.Item>
          </Descriptions>
        )}
      />
      {employeeQuery.data && (
        <EmployeeFormDrawer
          open={editOpen}
          onClose={() => setEditOpen(false)}
          employee={employeeQuery.data}
        />
      )}
    </>
  );
}
