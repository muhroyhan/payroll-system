export interface OvertimeLetterTemplateData {
  employeeName: string;
  employeeNik: string;
  date: string;
  plannedOvertimeHours: string;
  actualOvertimeHours: string;
  reason: string;
  verifiedByName: string;
  verifiedDate: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Pure function: data in, HTML string out — kept separate from the Puppeteer
// renderer so the letter layout is unit-testable without a browser.
export function renderOvertimeLetterHtml(
  data: OvertimeLetterTemplateData,
): string {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
  body { font-family: Arial, sans-serif; font-size: 12pt; color: #111; padding: 40px; }
  h1 { font-size: 16pt; text-align: center; margin-bottom: 32px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
  td { padding: 6px 4px; vertical-align: top; }
  td.label { width: 220px; color: #444; }
  .reason-box { border: 1px solid #ccc; padding: 12px; min-height: 60px; margin-bottom: 32px; }
  .signature { display: flex; justify-content: flex-end; margin-top: 48px; text-align: center; }
  .signature .block { width: 220px; }
  .signature .name { margin-top: 60px; font-weight: bold; text-decoration: underline; }
</style>
</head>
<body>
  <h1>SURAT LEMBUR</h1>

  <table>
    <tr><td class="label">Nama Karyawan</td><td>: ${escapeHtml(data.employeeName)}</td></tr>
    <tr><td class="label">NIK</td><td>: ${escapeHtml(data.employeeNik)}</td></tr>
    <tr><td class="label">Tanggal</td><td>: ${escapeHtml(data.date)}</td></tr>
    <tr><td class="label">Rencana Jam Lembur</td><td>: ${escapeHtml(data.plannedOvertimeHours)} jam</td></tr>
    <tr><td class="label">Realisasi Jam Lembur</td><td>: ${escapeHtml(data.actualOvertimeHours)} jam</td></tr>
  </table>

  <div class="label">Alasan:</div>
  <div class="reason-box">${escapeHtml(data.reason)}</div>

  <div class="signature">
    <div class="block">
      <div>Diverifikasi, ${escapeHtml(data.verifiedDate)}</div>
      <div class="name">${escapeHtml(data.verifiedByName)}</div>
    </div>
  </div>
</body>
</html>`;
}
