import { Steps } from 'antd';
import { LeaveRequestStatus } from '@payroll-system/shared-types';

interface LeaveRequestStatusStepsProps {
  status: LeaveRequestStatus;
}

// FE-T14 (09_FRONTEND_STEPS.md) — the pending → approved|rejected state
// machine (§15.9) as a visual Steps component, not a plain status string.
// "Approved" and "rejected" are both terminal branches off the same
// "decision" step; Steps' per-step `status` (finish/process/error) carries
// which branch actually happened.
export function LeaveRequestStatusSteps({ status }: LeaveRequestStatusStepsProps) {
  const decisionTitle =
    status === LeaveRequestStatus.PENDING
      ? 'Menunggu Persetujuan'
      : status === LeaveRequestStatus.APPROVED
        ? 'Disetujui'
        : 'Ditolak';

  const decisionStatus =
    status === LeaveRequestStatus.PENDING
      ? 'process'
      : status === LeaveRequestStatus.APPROVED
        ? 'finish'
        : 'error';

  return (
    <Steps
      size="small"
      items={[
        { title: 'Diajukan', status: 'finish' },
        { title: decisionTitle, status: decisionStatus },
      ]}
    />
  );
}
