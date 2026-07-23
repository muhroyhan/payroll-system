import { ConflictException } from '@nestjs/common';
import { assertPendingStatus } from './assert-pending';

// Shared guard reused by leave_requests AND surat_ijin (and future
// surat_peringatan/overtime_letter) — §11's "once decided, locked" rule.
describe('assertPendingStatus', () => {
  it('does not throw when the current status matches the pending value', () => {
    expect(() =>
      assertPendingStatus('pending', 'pending', 'Leave request', 'id-1'),
    ).not.toThrow();
  });

  it('throws ConflictException when already approved', () => {
    expect(() =>
      assertPendingStatus('approved', 'pending', 'Surat ijin', 'id-1'),
    ).toThrow(ConflictException);
  });

  it('throws ConflictException when already rejected', () => {
    expect(() =>
      assertPendingStatus('rejected', 'pending', 'Surat ijin', 'id-1'),
    ).toThrow(ConflictException);
  });

  it('includes the entity label, id, and current status in the error message', () => {
    try {
      assertPendingStatus('approved', 'pending', 'Surat ijin', 'abc-123');
      fail('expected assertPendingStatus to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(ConflictException);
      const message = (error as ConflictException).message;
      expect(message).toContain('Surat ijin abc-123');
      expect(message).toContain('already approved');
      expect(message).toContain('§11');
    }
  });
});
