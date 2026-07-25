import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Descriptions, Popconfirm, Space, Typography } from 'antd';
import { OvertimeLetterStatus } from '@payroll-system/shared-types';
import { DetailPage } from '../../../components/DetailPage';
import { LockedAction } from '../../../components/LockedAction';
import { StatusTag } from '../../../components/StatusTag';
import { ApiErrorDisplay } from '../../../components/ApiErrorDisplay';
import { formatDate } from '../../../components/format';
import { useDownloadPdf } from '../../../hooks/useDownloadPdf';
import { describeApiError, type ApiErrorPresentation } from '../../../api/errors';
import { PendingApprovalActions } from '../../../components/PendingApprovalActions';
import {
  useOvertimeLetterQuery,
  useRejectOvertimeLetterMutation,
  useRemoveOvertimeLetterMutation,
  useVerifyOvertimeLetterMutation,
} from './hooks';
import { OvertimeLetterFormDrawer } from './OvertimeLetterFormDrawer';
import { OVERTIME_LETTER_STATUS_LABELS } from './labels';

// FE-T20 (09_FRONTEND_STEPS.md), §15.10 C. TWO INDEPENDENT locks:
// (a) Verifikasi/Tolak — fully derivable from `status !== 'pending'`,
//     R-06a, via PendingApprovalActions (hidden once decided).
// (b) Ubah/Hapus — gated by a payslip-reference check that is NOT tied to
//     status at all (a verified-but-unused letter stays editable) and has
//     no flag on this response (§13.5 B-06) — R-06b: always enabled, the
//     server's 409 (if any) is the real answer, shown via
//     describeApiError()/ApiErrorDisplay (delete) or FormDrawer's built-in
//     conflict modal (edit).
export function OvertimeLetterDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const query = useOvertimeLetterQuery(id);
  const { download, downloading } = useDownloadPdf();

  const verifyMutation = useVerifyOvertimeLetterMutation(id ?? '');
  const rejectMutation = useRejectOvertimeLetterMutation(id ?? '');
  const removeMutation = useRemoveOvertimeLetterMutation();

  const [editOpen, setEditOpen] = useState(false);
  const [actionError, setActionError] = useState<ApiErrorPresentation | null>(null);

  const record = query.data;
  const isPending = record?.status === OvertimeLetterStatus.PENDING;

  const runAction = async (action: () => Promise<unknown>) => {
    setActionError(null);
    try {
      await action();
    } catch (err) {
      setActionError(describeApiError(err));
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    await runAction(async () => {
      await removeMutation.mutateAsync(id);
      navigate('/letters/overtime');
    });
  };

  return (
    <>
      <DetailPage
        title="Surat Lembur"
        backTo="/letters/overtime"
        query={query}
        actions={
          <Space>
            {record && (
              <PendingApprovalActions
                isPending={isPending}
                approveLabel="Verifikasi"
                approving={verifyMutation.isPending}
                rejecting={rejectMutation.isPending}
                onApprove={() => runAction(() => verifyMutation.mutateAsync())}
                onReject={() => runAction(() => rejectMutation.mutateAsync())}
              />
            )}
            <LockedAction
              locked={record ? !record.pdfPath : true}
              reason="PDF belum tersedia — sedang dibuat setelah surat lembur diverifikasi."
              loading={downloading}
              onClick={() =>
                record && download(`/overtime-letters/${record.id}/pdf`, `overtime-letter-${record.id}.pdf`)
              }
            >
              Unduh PDF
            </LockedAction>
            <Button onClick={() => setEditOpen(true)}>Ubah</Button>
            <Popconfirm title="Hapus surat lembur ini?" onConfirm={handleDelete}>
              <Button danger>Hapus</Button>
            </Popconfirm>
          </Space>
        }
        renderSummary={(data) => (
          <Descriptions bordered column={2} size="small">
            <Descriptions.Item label="Karyawan">{data.employee?.name ?? data.employeeId}</Descriptions.Item>
            <Descriptions.Item label="Status">
              <StatusTag value={data.status} labels={OVERTIME_LETTER_STATUS_LABELS} />
            </Descriptions.Item>
            <Descriptions.Item label="Tanggal">{formatDate(data.date)}</Descriptions.Item>
            <Descriptions.Item label="Diverifikasi/Ditolak Oleh (User ID)">
              {data.verifiedBy ?? '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Jam Lembur Direncanakan">
              {data.plannedOvertimeHours} jam
            </Descriptions.Item>
            <Descriptions.Item label="Jam Lembur Aktual">{data.actualOvertimeHours} jam</Descriptions.Item>
            <Descriptions.Item label="Alasan" span={2}>
              {data.reason}
            </Descriptions.Item>
            <Descriptions.Item label="" span={2}>
              {/* §9 R9 / TC-LETTER-03 — the single most misunderstood rule
                  in this module: payroll pays the ACTUAL hours, and only
                  once this letter is verified. Both numbers above are
                  exactly what the API returned — never recomputed (R-07). */}
              <Typography.Text type="secondary">
                Payroll membayar jam lembur <b>aktual</b>, dan hanya jika surat ini{' '}
                <b>terverifikasi</b> — bukan jam yang direncanakan.
              </Typography.Text>
            </Descriptions.Item>
          </Descriptions>
        )}
      />
      {record && (
        <OvertimeLetterFormDrawer
          open={editOpen}
          onClose={() => setEditOpen(false)}
          overtimeLetter={record}
        />
      )}
      <ApiErrorDisplay error={actionError} onDismiss={() => setActionError(null)} />
    </>
  );
}
