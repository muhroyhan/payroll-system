import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Descriptions, Form, Input, Modal, Popconfirm, Space } from 'antd';
import { SuratIjinStatus } from '@payroll-system/shared-types';
import { DetailPage } from '../../../components/DetailPage';
import { LockedAction } from '../../../components/LockedAction';
import { StatusTag } from '../../../components/StatusTag';
import { ApiErrorDisplay } from '../../../components/ApiErrorDisplay';
import { formatDate } from '../../../components/format';
import { useDownloadPdf } from '../../../hooks/useDownloadPdf';
import { describeApiError, type ApiErrorPresentation } from '../../../api/errors';
import { PendingApprovalActions } from '../../../components/PendingApprovalActions';
import {
  useApproveSuratIjinMutation,
  useRejectSuratIjinMutation,
  useRemoveSuratIjinMutation,
  useSuratIjinQuery,
} from './hooks';
import { SuratIjinFormDrawer } from './SuratIjinFormDrawer';
import { SURAT_IJIN_STATUS_LABELS, SURAT_IJIN_TYPE_LABELS } from './labels';

const LOCK_REASON = 'Surat ijin sudah diputuskan — buat pengajuan baru untuk koreksi.';

// FE-T18 (09_FRONTEND_STEPS.md), §15.10 A. Single lock, fully derivable from
// `status !== 'pending'` — same shape as leave_requests (FE-T14), so R-06a
// applies with no fallback needed.
export function SuratIjinDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const query = useSuratIjinQuery(id);
  const { download, downloading } = useDownloadPdf();

  const approveMutation = useApproveSuratIjinMutation(id ?? '');
  const rejectMutation = useRejectSuratIjinMutation(id ?? '');
  const removeMutation = useRemoveSuratIjinMutation();

  const [editOpen, setEditOpen] = useState(false);
  const [actionError, setActionError] = useState<ApiErrorPresentation | null>(null);
  // Audit-trail follow-up (§1A) — reject now requires a reason.
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectForm] = Form.useForm<{ reason: string }>();

  const record = query.data;
  const isPending = record?.status === SuratIjinStatus.PENDING;

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
      navigate('/letters/surat-ijin');
    });
  };

  const handleRejectSubmit = async () => {
    let values: { reason: string };
    try {
      values = await rejectForm.validateFields();
    } catch {
      return;
    }
    await runAction(async () => {
      await rejectMutation.mutateAsync(values.reason);
      setRejectModalOpen(false);
    });
  };

  return (
    <>
      <DetailPage
        title="Surat Ijin"
        backTo="/letters/surat-ijin"
        query={query}
        actions={
          <Space>
            {record && (
              <PendingApprovalActions
                isPending={isPending}
                approveLabel="Setujui"
                approving={approveMutation.isPending}
                rejecting={rejectMutation.isPending}
                onApprove={() => runAction(() => approveMutation.mutateAsync())}
                onReject={() => {
                  rejectForm.resetFields();
                  setRejectModalOpen(true);
                }}
              />
            )}
            <LockedAction
              locked={record ? !record.pdfPath : true}
              reason="PDF belum tersedia — sedang dibuat setelah surat ijin disetujui."
              loading={downloading}
              onClick={() => record && download(`/surat-ijin/${record.id}/pdf`, `surat-ijin-${record.id}.pdf`)}
            >
              Unduh PDF
            </LockedAction>
            <LockedAction locked={!isPending} reason={LOCK_REASON} onClick={() => setEditOpen(true)}>
              Ubah
            </LockedAction>
            <Popconfirm title="Hapus surat ijin ini?" disabled={!isPending} onConfirm={handleDelete}>
              <LockedAction locked={!isPending} reason={LOCK_REASON} danger>
                Hapus
              </LockedAction>
            </Popconfirm>
          </Space>
        }
        renderSummary={(data) => (
          <Descriptions bordered column={2} size="small">
            <Descriptions.Item label="Karyawan">{data.employee?.name ?? data.employeeId}</Descriptions.Item>
            <Descriptions.Item label="Status">
              <StatusTag value={data.status} labels={SURAT_IJIN_STATUS_LABELS} />
            </Descriptions.Item>
            <Descriptions.Item label="Jenis">
              <StatusTag value={data.type} labels={SURAT_IJIN_TYPE_LABELS} />
            </Descriptions.Item>
            <Descriptions.Item label="Jam">{data.timeRequested}</Descriptions.Item>
            <Descriptions.Item label="Tanggal">{formatDate(data.date)}</Descriptions.Item>
            <Descriptions.Item label="Dibuat Oleh">
              {data.createdByUser?.name ?? '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Disetujui Oleh">
              {data.approvedByUser?.name ?? '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Alasan Pengajuan" span={2}>
              {data.reason}
            </Descriptions.Item>
            {data.rejectedBy && (
              <Descriptions.Item label="Ditolak Oleh" span={2}>
                {data.rejectedByUser?.name ?? '—'} — "{data.rejectReason}"
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      />
      {record && (
        <SuratIjinFormDrawer open={editOpen} onClose={() => setEditOpen(false)} suratIjin={record} />
      )}
      <Modal
        title="Tolak surat ijin ini?"
        open={rejectModalOpen}
        onCancel={() => setRejectModalOpen(false)}
        onOk={handleRejectSubmit}
        okText="Ya, tolak"
        okButtonProps={{ danger: true, loading: rejectMutation.isPending }}
        cancelText="Batal"
        destroyOnClose
      >
        <Form form={rejectForm} layout="vertical">
          <Form.Item
            name="reason"
            label="Alasan penolakan"
            rules={[
              { required: true, message: 'Alasan penolakan wajib diisi' },
              { min: 5, message: 'Alasan penolakan minimal 5 karakter' },
            ]}
          >
            <Input.TextArea rows={3} placeholder="Jelaskan kenapa surat ijin ini ditolak…" />
          </Form.Item>
        </Form>
      </Modal>
      <ApiErrorDisplay error={actionError} onDismiss={() => setActionError(null)} />
    </>
  );
}
