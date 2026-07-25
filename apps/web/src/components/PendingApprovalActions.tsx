import { Button, Space } from 'antd';

interface PendingApprovalActionsProps {
  isPending: boolean;
  onApprove: () => void;
  onReject: () => void;
  approving: boolean;
  rejecting: boolean;
  approveLabel: string;
  rejectLabel?: string;
}

// FE-T18/T20/T21 (09_FRONTEND_STEPS.md) — the piece genuinely identical
// across every pending → approved|rejected workflow (surat_ijin, overtime
// letters' verify/reject, kasbon): a button pair that exists ONLY while
// status is pending. Lives in components/, not features/letters/, because
// kasbon (FE-T21) is its third consumer and isn't a letter — this is a
// generic UI piece, not a letters-specific one. surat_peringatan has no such
// workflow at all (no status field, no approve/reject endpoints — verified
// against surat-peringatan.controller.ts), so it doesn't use this component.
export function PendingApprovalActions({
  isPending,
  onApprove,
  onReject,
  approving,
  rejecting,
  approveLabel,
  rejectLabel = 'Tolak',
}: PendingApprovalActionsProps) {
  if (!isPending) return null;

  return (
    <Space>
      <Button type="primary" onClick={onApprove} loading={approving}>
        {approveLabel}
      </Button>
      <Button danger onClick={onReject} loading={rejecting}>
        {rejectLabel}
      </Button>
    </Space>
  );
}
