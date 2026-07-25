import { PayrollRunSummary } from './payroll-run-summary.service';

const COLUMNS = [
  'department',
  'employee_count',
  'gross_pay',
  'taxable_gross',
  'pph21_amount',
  'bpjs_kesehatan_employee',
  'bpjs_kesehatan_company',
  'bpjs_jht_employee',
  'bpjs_jht_company',
  'bpjs_jp_employee',
  'bpjs_jp_company',
  'bpjs_jkk_company',
  'bpjs_jkm_company',
  'net_pay',
] as const;

function escapeCsvField(value: string | number): string {
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// Pure function: summary in, CSV string out — one row per department plus a
// TOTAL row, so the CSV is self-contained (no need to cross-reference the
// JSON endpoint to know the grand total).
export function renderPayrollRunSummaryCsv(summary: PayrollRunSummary): string {
  const lines = [COLUMNS.join(',')];

  for (const dept of summary.byDepartment) {
    lines.push(
      [
        dept.departmentName,
        dept.employeeCount,
        dept.grossPay,
        dept.taxableGross,
        dept.pph21Amount,
        dept.bpjsKesehatanEmployee,
        dept.bpjsKesehatanCompany,
        dept.bpjsJhtEmployee,
        dept.bpjsJhtCompany,
        dept.bpjsJpEmployee,
        dept.bpjsJpCompany,
        dept.bpjsJkkCompany,
        dept.bpjsJkmCompany,
        dept.netPay,
      ]
        .map(escapeCsvField)
        .join(','),
    );
  }

  const t = summary.totals;
  lines.push(
    [
      'TOTAL',
      t.employeeCount,
      t.grossPay,
      t.taxableGross,
      t.pph21Amount,
      t.bpjsKesehatanEmployee,
      t.bpjsKesehatanCompany,
      t.bpjsJhtEmployee,
      t.bpjsJhtCompany,
      t.bpjsJpEmployee,
      t.bpjsJpCompany,
      t.bpjsJkkCompany,
      t.bpjsJkmCompany,
      t.netPay,
    ]
      .map(escapeCsvField)
      .join(','),
  );

  return lines.join('\n') + '\n';
}
