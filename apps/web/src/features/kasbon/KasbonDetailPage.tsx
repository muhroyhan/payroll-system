import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Descriptions, Popconfirm, Progress, Space, Typography } from 'antd';
import { KasbonStatus } from '@payroll-system/shared-types';
import { DetailPage } from '../../components/DetailPage';
import { LockedAction } from '../../components/LockedAction';
import { StatusTag } from '../../components/StatusTag';
import { ApiErrorDisplay } from '../../components/ApiErrorDisplay';
import { PendingApprovalActions } from '../../components/PendingApprovalActions';
import { formatIDR } from '../../components/format';
import { describeApiError, type ApiErrorPresentation } from '../../api/errors';
import {
  useApproveKasbonMutation,
  useKasbonQuery,
  useRejectKasbonMutation,
  useRemoveKasbonMutation,
} from './hooks';
import { KasbonFormDrawer } from './KasbonFormDrawer';
import { KASBON_STATUS_LABELS } from './labels';
import { hasDeductionStarted } from './api';

// FE-T21 (09_FRONTEND_STEPS.md), §15.11 (08_FRONTEND_STRUCTURE.md). Three
// layered locks, ALL fully derivable from status/remainingBalance/amount —
// no payslip-reference-style invisible lock here, unlike surat_peringatan/
// overtime_letter (FE-T19/T20). See api.ts's note for the full breakdown.
export function KasbonDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const query = useKasbonQuery(id);

  const approveMutation = useApproveKasbonMutation(id ?? '');
  const rejectMutation = useRejectKasbonMutation(id ?? '');
  const removeMutation = useRemoveKasbonMutation();

  const [editOpen, setEditOpen] = useState(false);
  const [actionError, setActionError] = useState<ApiErrorPresentation | null>(null);

  const record = query.data;
  const isPending = record?.status === KasbonStatus.PENDING;
  const isDeadEnd =
    record?.status === KasbonStatus.REJECTED || record?.status === KasbonStatus.PAID_OFF;
  const deductionStarted = record ? hasDeductionStarted(record) : false;

  const editReason = !record
    ? undefined
    : record.status === KasbonStatus.REJECTED
      ? 'Kasbon ini ditolak — buat kasbon baru untuk koreksi.'
      : record.status === KasbonStatus.PAID_OFF
        ? 'Kasbon ini sudah lunas — sudah selesai dan terkunci.'
        : undefined;

  const deleteReason = !record
    ? undefined
    : isDeadEnd
      ? editReason
      : deductionStarted
        ? 'Sudah ada cicilan yang terpotong — buat kasbon baru untuk koreksi, bukan menghapus yang ini.'
        : undefined;

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
      navigate('/kasbon');
    });
  };

  return (
    <>
      <DetailPage
        title="Kasbon"
        backTo="/kasbon"
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
                onReject={() => runAction(() => rejectMutation.mutateAsync())}
              />
            )}
            <LockedAction locked={isDeadEnd} reason={editReason} onClick={() => setEditOpen(true)}>
              Ubah
            </LockedAction>
            <Popconfirm
              title="Hapus kasbon ini?"
              disabled={isDeadEnd || deductionStarted}
              onConfirm={handleDelete}
            >
              <LockedAction locked={isDeadEnd || deductionStarted} reason={deleteReason} danger>
                Hapus
              </LockedAction>
            </Popconfirm>
          </Space>
        }
        renderSummary={(data) => (
          <Descriptions bordered column={2} size="small">
            <Descriptions.Item label="Karyawan">{data.employee?.name ?? data.employeeId}</Descriptions.Item>
            <Descriptions.Item label="Status">
              <StatusTag value={data.status} labels={KASBON_STATUS_LABELS} />
            </Descriptions.Item>
            <Descriptions.Item label="Jumlah">{formatIDR(Number(data.amount))}</Descriptions.Item>
            <Descriptions.Item label="Disetujui/Ditolak Oleh (User ID)">
              {data.approvedBy ?? '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Jumlah Cicilan">{data.installmentCount}x</Descriptions.Item>
            <Descriptions.Item label="Nominal per Cicilan">
              {formatIDR(Number(data.installmentAmount))}
            </Descriptions.Item>
            <Descriptions.Item label="Sisa Saldo" span={2}>
              {/* R-07 — displayed exactly as the API returned it, never
                  recomputed. null specifically means "not approved yet". */}
              {data.remainingBalance === null ? (
                <Typography.Text type="secondary">Belum disetujui.</Typography.Text>
              ) : (
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Typography.Text>{formatIDR(Number(data.remainingBalance))}</Typography.Text>
                  <Progress
                    percent={Math.round(
                      ((Number(data.amount) - Number(data.remainingBalance)) / Number(data.amount)) * 100,
                    )}
                  />
                </Space>
              )}
            </Descriptions.Item>
          </Descriptions>
        )}
      />
      {record && <KasbonFormDrawer open={editOpen} onClose={() => setEditOpen(false)} kasbon={record} />}
      <ApiErrorDisplay error={actionError} onDismiss={() => setActionError(null)} />
    </>
  );
}
