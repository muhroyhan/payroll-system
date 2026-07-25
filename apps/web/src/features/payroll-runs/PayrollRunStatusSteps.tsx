import { Steps, Typography } from 'antd';
import { PayrollRunStatus } from '@payroll-system/shared-types';

interface PayrollRunStatusStepsProps {
  status: PayrollRunStatus;
}

const STEP_ORDER = [
  PayrollRunStatus.DRAFT,
  PayrollRunStatus.CALCULATED,
  PayrollRunStatus.APPROVED,
  PayrollRunStatus.DISBURSED,
];

// FE-T26 (09_FRONTEND_STEPS.md), §15.12 (08_FRONTEND_STRUCTURE.md) — the
// forward path as antd Steps, with the one backward edge (calculated →
// draft, revert) called out explicitly as a step description rather than
// left implicit, and the terminal `disbursed` state marked as permanently
// locked. Verified against payroll-run-transitions.ts: there is exactly one
// revert edge, only from `calculated`; nothing past `approved` ever moves
// backward.
export function PayrollRunStatusSteps({ status }: PayrollRunStatusStepsProps) {
  const currentIndex = STEP_ORDER.indexOf(status);

  return (
    <Steps
      current={currentIndex}
      items={[
        { title: 'Draft' },
        {
          title: 'Terhitung',
          description:
            status === PayrollRunStatus.CALCULATED ? (
              <Typography.Text type="secondary">Dapat dikembalikan ke Draft</Typography.Text>
            ) : undefined,
        },
        { title: 'Disetujui' },
        {
          title: 'Dicairkan',
          description:
            status === PayrollRunStatus.DISBURSED ? (
              <Typography.Text type="danger">Terkunci permanen — tidak ada jalur revert</Typography.Text>
            ) : undefined,
        },
      ]}
    />
  );
}
