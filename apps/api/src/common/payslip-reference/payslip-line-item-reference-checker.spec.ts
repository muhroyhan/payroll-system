import { PayslipLineItemReferenceChecker } from './payslip-line-item-reference-checker';

describe('PayslipLineItemReferenceChecker (P8-T04)', () => {
  function make(countResult: number) {
    const model = { count: jest.fn().mockResolvedValue(countResult) };
    const checker = new PayslipLineItemReferenceChecker(model as never);
    return { checker, model };
  }

  it('returns true when a line item cites the (source, source_id)', async () => {
    const { checker, model } = make(1);
    await expect(
      checker.isReferencedByPayslip('sanction', 'sp-1'),
    ).resolves.toBe(true);
    expect(model.count).toHaveBeenCalledWith({
      where: { source: 'sanction', sourceId: 'sp-1' },
    });
  });

  it('returns false when no line item references it', async () => {
    const { checker } = make(0);
    await expect(
      checker.isReferencedByPayslip('overtime', 'ol-1'),
    ).resolves.toBe(false);
  });
});
