// P7-T06 (§9 Step 1–2) — assembles the two BASES (taxable + BPJS-eligible) from
// an employee's fixed + variable earning components for one month. Pure/
// stateless: it only SUMS each component into the bases according to its flags.
// It does NOT recompute TER/PPh21/BPJS — P7-T03 (employee) / P7-T05 (company)
// consume these bases afterward.
//
// §3 — the split is driven ENTIRELY by per-component flags, never by hardcoding
// which component *kind* is taxable/eligible. `source` is carried only for
// traceability (Phase 8 payslip_line_items) and is never inspected for tax
// logic here.

export type EarningSource =
  'base_salary' | 'incentive' | 'temp_component' | 'overtime' | 'thr';

export interface EarningComponent {
  source: EarningSource;
  amount: number;
  // From payslip_component_master.is_taxable — read from the master row, never
  // hardcoded per component kind (§3).
  isTaxable: boolean;
  // Whether this component counts toward the BPJS wage base. ⚠️ There is NO
  // is_bpjs_eligible column on payslip_component_master yet (only is_taxable),
  // so this flag currently has no data source and must be supplied explicitly.
  // See the P7-T06 report: recommend adding the field rather than hardcoding
  // "THR/overtime excluded".
  isBpjsEligible: boolean;
}

export interface AssembledEarningsBase {
  grossEarnings: number; // §9 Step 1 total (every component)
  taxableGross: number; // → PPh21 TER base (P7-T03) / annual gross (P7-T04)
  bpjsEligibleGross: number; // → BPJS base (P7-T03 employee / P7-T05 company)
}

export function assembleEarningsBase(
  components: EarningComponent[],
): AssembledEarningsBase {
  let grossEarnings = 0;
  let taxableGross = 0;
  let bpjsEligibleGross = 0;
  for (const component of components) {
    grossEarnings += component.amount;
    if (component.isTaxable) {
      taxableGross += component.amount;
    }
    if (component.isBpjsEligible) {
      bpjsEligibleGross += component.amount;
    }
  }
  return { grossEarnings, taxableGross, bpjsEligibleGross };
}

// Concrete P6-T01 link: a payslip_temp_component's taxability is read straight
// from its payslip_component_master row (the loaded `component` association) —
// never hardcoded by component name/kind (§3). is_bpjs_eligible has no master
// column yet, so it must be passed explicitly until that field exists (see the
// P7-T06 report). Typed structurally so this core stays DB-free.
export function tempComponentToEarning(
  tempComponent: { amount: string; component: { isTaxable: boolean } },
  isBpjsEligible: boolean,
): EarningComponent {
  return {
    source: 'temp_component',
    amount: Number(tempComponent.amount),
    isTaxable: tempComponent.component.isTaxable,
    isBpjsEligible,
  };
}
