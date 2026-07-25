// R9 (P8-T04b, §9) — overtime pay per PP 35/2021 Pasal 31. Pure/stateless.
//
//   hourly_rate = monthly base_salary ÷ 173
//   pay(H)      = 1.5 × hourly × min(H, 1)     (first hour)
//               + 2.0 × hourly × max(H − 1, 0) (each hour after the first)
//
// H = actual_overtime_hours from ONE verified overtime_letter (one day, so the
// first-hour premium applies per letter). Taxable but NOT BPJS-eligible (§9
// Step 2 — one-off/incidental). Rounded to whole rupiah.
export function calculateOvertimePay(
  monthlyBaseSalary: number,
  actualOvertimeHours: number,
): number {
  if (actualOvertimeHours <= 0 || monthlyBaseSalary <= 0) {
    return 0;
  }
  const hourlyRate = monthlyBaseSalary / 173;
  const firstHour = 1.5 * hourlyRate * Math.min(actualOvertimeHours, 1);
  const remainingHours = 2 * hourlyRate * Math.max(actualOvertimeHours - 1, 0);
  return Math.round(firstHour + remainingHours);
}
