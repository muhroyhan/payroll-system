// P7-T03 (R5, §9 Step 3) — employee-side BPJS deductions. Pure/stateless:
// rates/caps come from the effective constant rows, fetched by the service.
//
// Computed INDEPENDENTLY of PPh21: none of these reduce the TER base (Step 3
// is separate from Step 4). Kesehatan and JP are wage-capped; JHT is uncapped.
// JKK/JKM are company-only (0% employee), so they never appear here.

export interface BpjsEmployeeRates {
  kesehatanRate: number;
  kesehatanCap: number;
  jhtRate: number;
  jpRate: number;
  jpCap: number;
}

export interface BpjsEmployeeResult {
  kesehatan: number;
  jht: number;
  jp: number;
  total: number;
}

export function calculateEmployeeBpjs(
  bpjsEligibleEarnings: number,
  rates: BpjsEmployeeRates,
): BpjsEmployeeResult {
  const kesehatan = Math.round(
    Math.min(bpjsEligibleEarnings, rates.kesehatanCap) * rates.kesehatanRate,
  );
  const jht = Math.round(bpjsEligibleEarnings * rates.jhtRate);
  const jp = Math.round(
    Math.min(bpjsEligibleEarnings, rates.jpCap) * rates.jpRate,
  );
  return { kesehatan, jht, jp, total: kesehatan + jht + jp };
}
