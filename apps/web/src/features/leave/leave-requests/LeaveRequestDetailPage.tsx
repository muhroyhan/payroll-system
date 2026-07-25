import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Descriptions, Popconfirm, Space, Typography } from 'antd';
import { LeaveRequestStatus } from '@payroll-system/shared-types';
import { DetailPage } from '../../../components/DetailPage';
import { LockedAction } from '../../../components/LockedAction';
import { StatusTag } from '../../../components/StatusTag';
import { ApiErrorDisplay } from '../../../components/ApiErrorDisplay';
import { formatDate } from '../../../components/format';
import { describeApiError, type ApiErrorPresentation } from '../../../api/errors';
import { useEmployeesQuery } from '../../employees/hooks';
import {
  useApproveLeaveRequestMutation,
  useLeaveRequestQuery,
  useRejectLeaveRequestMutation,
  useRemoveLeaveRequestMutation,
} from './hooks';
import { LeaveRequestFormDrawer } from './LeaveRequestFormDrawer';
import { LeaveRequestStatusSteps } from './LeaveRequestStatusSteps';
import { LEAVE_REQUEST_STATUS_LABELS } from './labels';

// FE-T14 (09_FRONTEND_STEPS.md), §15.9. The requested-day count is
// deliberately NOT shown as a number here — no endpoint exposes one (see
// api.ts's note); it only ever appears inside the approval 409's own
// message, surfaced as-is below via ApiErrorDisplay. This is "display the
// API's figure as-is" applied to a figure that only exists in an error
// message, not a screen inventing one to fill the gap (R-07/R-10).
export function LeaveRequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const employeesQuery = useEmployeesQuery();
  const requestQuery = useLeaveRequestQuery(id);

  const approveMutation = useApproveLeaveRequestMutation(id ?? '');
  const rejectMutation = useRejectLeaveRequestMutation(id ?? '');
  const removeMutation = useRemoveLeaveRequestMutation();

  const [editOpen, setEditOpen] = useState(false);
  const [actionError, setActionError] = useState<ApiErrorPresentation | null>(null);

  const employeeName = (employeeId: string) =>
    employeesQuery.data?.find((employee) => employee.id === employeeId)?.name ?? employeeId;

  const handleApprove = async () => {
    setActionError(null);
    try {
      await approveMutation.mutateAsync();
    } catch (err) {
      // TC-LEAVE-04 — a 409 here means approving would exceed the remaining
      // balance. The backend's message already states the exact day count,
      // quota, and used amount; shown verbatim, never recomputed (R-04/R-07).
      setActionError(describeApiError(err));
    }
  };

  const handleReject = async () => {
    setActionError(null);
    try {
      await rejectMutation.mutateAsync();
    } catch (err) {
      setActionError(describeApiError(err));
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    setActionError(null);
    try {
      await removeMutation.mutateAsync(id);
      navigate('/leave/requests');
    } catch (err) {
      setActionError(describeApiError(err));
    }
  };

  const request = requestQuery.data;
  const isPending = request?.status === LeaveRequestStatus.PENDING;

  return (
    <>
      <DetailPage
        title="Pengajuan Cuti"
        backTo="/leave/requests"
        query={requestQuery}
        actions={
          <Space>
            {isPending && (
              <>
                <Button type="primary" onClick={handleApprove} loading={approveMutation.isPending}>
                  Setujui
                </Button>
                <Button danger onClick={handleReject} loading={rejectMutation.isPending}>
                  Tolak
                </Button>
              </>
            )}
            {/* R-06a — fully derivable from `status`, no fallback needed. */}
            <LockedAction
              locked={!isPending}
              reason="Pengajuan sudah diputuskan — buat pengajuan baru untuk koreksi."
              onClick={() => setEditOpen(true)}
            >
              Ubah
            </LockedAction>
            <Popconfirm
              title="Hapus pengajuan ini?"
              disabled={!isPending}
              onConfirm={handleDelete}
            >
              <LockedAction
                locked={!isPending}
                reason="Pengajuan sudah diputuskan — buat pengajuan baru untuk koreksi."
                danger
              >
                Hapus
              </LockedAction>
            </Popconfirm>
          </Space>
        }
        renderSummary={(data) => (
          <>
            <LeaveRequestStatusSteps status={data.status} />
            <Descriptions bordered column={2} size="small" style={{ marginTop: 16 }}>
              <Descriptions.Item label="Karyawan">
                {employeeName(data.employeeId)}
              </Descriptions.Item>
              <Descriptions.Item label="Jenis Cuti">
                {data.leaveType?.name ?? '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <StatusTag value={data.status} labels={LEAVE_REQUEST_STATUS_LABELS} />
              </Descriptions.Item>
              {/* approvedBy is a user id (the admin/HR staff who decided),
                  not an employee id — GET /users is admin-only (§15.14), so
                  it isn't resolvable to a name for every viewer here; shown
                  as-is rather than guessed at. */}
              <Descriptions.Item label="Diputuskan Oleh (User ID)">
                {data.approvedBy ?? '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Tanggal Cuti" span={2}>
                {formatDate(data.startDate)} — {formatDate(data.endDate)}
                <br />
                <Typography.Text type="secondary">
                  Jumlah hari kerja dihitung sistem saat disetujui (Senin–Jumat; hari libur
                  perusahaan belum dikecualikan, §5.4) — akan tampil di pesan jika pengajuan ini
                  melebihi sisa saldo cuti.
                </Typography.Text>
              </Descriptions.Item>
            </Descriptions>
          </>
        )}
      />
      {request && (
        <LeaveRequestFormDrawer open={editOpen} onClose={() => setEditOpen(false)} request={request} />
      )}
      <ApiErrorDisplay error={actionError} onDismiss={() => setActionError(null)} />
    </>
  );
}
