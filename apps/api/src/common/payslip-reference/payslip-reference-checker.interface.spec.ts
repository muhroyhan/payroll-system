import { NoPayslipReferenceChecker } from './payslip-reference-checker.interface';

// Default Phase-4 stub, shared by surat_peringatan (source='sanction') and
// overtime_letter (source='overtime') — Phase 8 swaps this DI binding for a
// real payslip_line_items-backed implementation without touching either
// service.
describe('NoPayslipReferenceChecker', () => {
  it('always reports not-referenced, regardless of source or id', async () => {
    const checker = new NoPayslipReferenceChecker();
    await expect(
      checker.isReferencedByPayslip('sanction', 'any-id'),
    ).resolves.toBe(false);
    await expect(
      checker.isReferencedByPayslip('overtime', 'any-id'),
    ).resolves.toBe(false);
  });
});
