import { SPLevel } from '@payroll-system/shared-types';

export interface SuratPeringatanTemplateData {
  employeeName: string;
  employeeNik: string;
  level: SPLevel;
  violationDescription: string;
  issueDate: string;
  sanctionComponentName: string | null;
  sanctionAmount: string | null;
  issuedByName: string;
}

const LEVEL_LABEL: Record<SPLevel, string> = {
  [SPLevel.SP1]: 'Surat Peringatan Pertama (SP1)',
  [SPLevel.SP2]: 'Surat Peringatan Kedua (SP2)',
  [SPLevel.SP3]: 'Surat Peringatan Ketiga (SP3)',
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Pure function: data in, HTML string out — kept separate from the Puppeteer
// renderer so the letter layout is unit-testable without a browser.
export function renderSuratPeringatanHtml(
  data: SuratPeringatanTemplateData,
): string {
  const sanctionRow =
    data.sanctionComponentName && data.sanctionAmount
      ? `<tr><td class="label">Sanksi</td><td>: ${escapeHtml(data.sanctionComponentName)} — Rp ${escapeHtml(data.sanctionAmount)}</td></tr>`
      : `<tr><td class="label">Sanksi</td><td>: -</td></tr>`;

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
  body { font-family: Arial, sans-serif; font-size: 12pt; color: #111; padding: 40px; }
  h1 { font-size: 16pt; text-align: center; margin-bottom: 4px; }
  .subtitle { text-align: center; margin-bottom: 32px; color: #444; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
  td { padding: 6px 4px; vertical-align: top; }
  td.label { width: 180px; color: #444; }
  .violation-box { border: 1px solid #ccc; padding: 12px; min-height: 60px; margin-bottom: 32px; }
  .signature { display: flex; justify-content: flex-end; margin-top: 48px; text-align: center; }
  .signature .block { width: 220px; }
  .signature .name { margin-top: 60px; font-weight: bold; text-decoration: underline; }
</style>
</head>
<body>
  <h1>SURAT PERINGATAN</h1>
  <div class="subtitle">${escapeHtml(LEVEL_LABEL[data.level])}</div>

  <table>
    <tr><td class="label">Nama Karyawan</td><td>: ${escapeHtml(data.employeeName)}</td></tr>
    <tr><td class="label">NIK</td><td>: ${escapeHtml(data.employeeNik)}</td></tr>
    <tr><td class="label">Tanggal Terbit</td><td>: ${escapeHtml(data.issueDate)}</td></tr>
    ${sanctionRow}
  </table>

  <div class="label">Uraian Pelanggaran:</div>
  <div class="violation-box">${escapeHtml(data.violationDescription)}</div>

  <div class="signature">
    <div class="block">
      <div>Diterbitkan, ${escapeHtml(data.issueDate)}</div>
      <div class="name">${escapeHtml(data.issuedByName)}</div>
    </div>
  </div>
</body>
</html>`;
}
