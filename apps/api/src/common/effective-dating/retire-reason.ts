import { BadRequestException } from '@nestjs/common';
import { EffectiveDatedFields } from './resolve-effective';

// Audit-trail follow-up (dispute-traceability review, §1C) — a master row is
// being manually retired when its effectiveEndDate flips from open (null) to
// closed (a real date) through a plain update() call (as opposed to
// closeOverlappingPredecessor's automatic retire, which always supplies its
// own generated reason — see that function). Whoever does this must record
// why, same "no actor/reason-less destructive action" principle as
// RevertPayrollRunDto.
export function isManualRetireTransition(
  record: EffectiveDatedFields,
  dto: { effectiveEndDate?: string | null },
): boolean {
  return (
    record.effectiveEndDate === null &&
    dto.effectiveEndDate !== undefined &&
    dto.effectiveEndDate !== null
  );
}

export function assertRetireReasonProvided(
  record: EffectiveDatedFields,
  dto: { effectiveEndDate?: string | null; reason?: string },
): void {
  if (isManualRetireTransition(record, dto) && !dto.reason?.trim()) {
    throw new BadRequestException(
      'Alasan retire wajib diisi saat menutup masa berlaku baris ini (effectiveEndDate)',
    );
  }
}
