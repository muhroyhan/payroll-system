import { PtkpStatus } from '@payroll-system/shared-types';
import { MonthlyPayslipCalculationService } from './monthly-payslip-calculation.service';

// Proves the P7-T08 wiring end-to-end: the service derives the R4 surcharge
// from the employee's `npwp` field (not a pre-computed boolean).
describe('MonthlyPayslipCalculationService — NPWP surcharge wiring (P7-T08)', () => {
  function makeService() {
    // cat A bracket covering 8,000,000 → 1.5%.
    const terBracketMasterService = {
      resolveEffective: jest.fn().mockResolvedValue([
        {
          terCategory: 'A',
          incomeLowerBound: '7500001',
          incomeUpperBound: '8550000',
          rate: '0.01500',
        },
      ]),
    };
    const bpjsKesehatanMasterService = {
      resolveEffective: jest
        .fn()
        .mockResolvedValue({ employeeRate: '0.01000', wageCap: '12000000.00' }),
    };
    const bpjsKetenagakerjaanMasterService = {
      resolveEffective: jest.fn().mockResolvedValue({
        jhtEmployeeRate: '0.02000',
        jpEmployeeRate: '0.01000',
        jpWageCap: '11086300.00',
      }),
    };
    const service = new MonthlyPayslipCalculationService(
      terBracketMasterService as any,
      bpjsKesehatanMasterService as any,
      bpjsKetenagakerjaanMasterService as any,
    );
    return { service };
  }

  const baseInput = {
    periodDate: '2026-07-01',
    taxableBruto: 8_000_000,
    bpjsEligibleEarnings: 8_000_000,
    ptkpStatus: PtkpStatus.TK_0,
  };

  it('npwp present → no surcharge (WE-01 baseline 120,000)', async () => {
    const { service } = makeService();
    const result = await service.calculateMonthly({
      ...baseInput,
      npwp: '12.345.678.9-012.000',
    });
    expect(result.pph21.pph21).toBe(120_000);
  });

  it('npwp null → 20% surcharge applied (144,000)', async () => {
    const { service } = makeService();
    const result = await service.calculateMonthly({ ...baseInput, npwp: null });
    expect(result.pph21.pph21).toBe(144_000);
  });

  it('npwp blank string → treated as missing → surcharge applied', async () => {
    const { service } = makeService();
    const result = await service.calculateMonthly({
      ...baseInput,
      npwp: '   ',
    });
    expect(result.pph21.pph21).toBe(144_000);
  });
});
