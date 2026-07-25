export interface PayslipTemplateLineItem {
  label: string;
  amount: string;
}

export interface PayslipTemplateData {
  employeeName: string;
  employeeNik: string;
  period: string;
  lineItems: PayslipTemplateLineItem[];
  netPay: string;
  issuedDate: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatRupiah(amount: string): string {
  const n = Number(amount);
  const sign = n < 0 ? '-' : '';
  return `${sign}Rp ${Math.abs(n).toLocaleString('id-ID')}`;
}

// Pure function: data in, HTML string out (same shape as the letter
// templates) — the tabular earning/deduction breakdown is exactly the case
// P4-T01 picked Puppeteer/HTML-table rendering for. Rows come straight from
// payslip_line_items (source + source_id + amount), signed so the total
// always foots to net_pay.
export function renderPayslipHtml(data: PayslipTemplateData): string {
  const rows = data.lineItems
    .map(
      (item) =>
        `<tr><td>${escapeHtml(item.label)}</td><td class="amount">${escapeHtml(formatRupiah(item.amount))}</td></tr>`,
    )
    .join('\n    ');

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
  body { font-family: Arial, sans-serif; font-size: 12pt; color: #111; padding: 40px; }
  h1 { font-size: 16pt; text-align: center; margin-bottom: 4px; }
  .subtitle { text-align: center; margin-bottom: 32px; color: #444; }
  .header-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
  .header-table td { padding: 4px; vertical-align: top; }
  .header-table td.label { width: 180px; color: #444; }
  table.lines { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
  table.lines th, table.lines td { padding: 6px 8px; border-bottom: 1px solid #ddd; text-align: left; }
  table.lines td.amount, table.lines th.amount { text-align: right; }
  table.lines tfoot td { font-weight: bold; border-top: 2px solid #111; border-bottom: none; }
</style>
</head>
<body>
  <h1>SLIP GAJI</h1>
  <div class="subtitle">Periode ${escapeHtml(data.period)}</div>

  <table class="header-table">
    <tr><td class="label">Nama Karyawan</td><td>: ${escapeHtml(data.employeeName)}</td></tr>
    <tr><td class="label">NIK</td><td>: ${escapeHtml(data.employeeNik)}</td></tr>
  </table>

  <table class="lines">
    <thead><tr><th>Keterangan</th><th class="amount">Jumlah</th></tr></thead>
    <tbody>
    ${rows}
    </tbody>
    <tfoot><tr><td>Take Home Pay</td><td class="amount">${escapeHtml(formatRupiah(data.netPay))}</td></tr></tfoot>
  </table>

  <div class="subtitle">Diterbitkan ${escapeHtml(data.issuedDate)}</div>
</body>
</html>`;
}
