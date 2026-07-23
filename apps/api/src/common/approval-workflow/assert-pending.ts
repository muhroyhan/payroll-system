import { ConflictException } from '@nestjs/common';

// Shared across every pending → approved/rejected workflow (leave_requests,
// surat_ijin, and future surat_peringatan/overtime_letter — §5.5/§5.4). Once a
// record leaves "pending", it's permanently locked (§11): no edit, no delete,
// no un-approve/un-reject. A correction is always a new record, never a
// mutation of the original. One guard, reused everywhere this shape appears.
export function assertPendingStatus(
  currentStatus: string,
  pendingValue: string,
  entityLabel: string,
  id: string,
): void {
  if (currentStatus !== pendingValue) {
    throw new ConflictException(
      `${entityLabel} ${id} is already ${currentStatus} — approved/rejected records are ` +
        `locked (§11); create a new one to correct it`,
    );
  }
}
