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

// FE-T18/T20 (09_FRONTEND_STEPS.md), §15.10 (08_FRONTEND_STRUCTURE.md) — the
// one piece genuinely identical across surat_ijin (approve/reject) and
// overtime_letter (verify/reject): a button pair that exists ONLY while
// status is pending. surat_peringatan has no such workflow at all (no
// pending/approved status, no approve/reject endpoints — verified against
// surat-peringatan.controller.ts), so it doesn't use this component.
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
