import { SuratIjinType } from '@payroll-system/shared-types';

export interface SuratIjinTemplateData {
  employeeName: string;
  employeeNik: string;
  date: string;
  type: SuratIjinType;
  reason: string;
  timeRequested: string;
  approvedByName: string;
  issuedDate: string;
}

const TYPE_LABEL: Record<SuratIjinType, string> = {
  [SuratIjinType.LATE_ARRIVAL]: 'Keterlambatan (Late Arrival)',
  [SuratIjinType.EARLY_LEAVE]: 'Pulang Lebih Awal (Early Leave)',
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Pure function: data in, HTML string out. The PDF renderer (Puppeteer) turns
// this into a PDF — kept separate so the letter layout is unit-testable
// without spinning up a browser.
export function renderSuratIjinHtml(data: SuratIjinTemplateData): string {
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
  .reason-box { border: 1px solid #ccc; padding: 12px; min-height: 60px; margin-bottom: 32px; }
  .signature { display: flex; justify-content: flex-end; margin-top: 48px; text-align: center; }
  .signature .block { width: 220px; }
  .signature .name { margin-top: 60px; font-weight: bold; text-decoration: underline; }
</style>
</head>
<body>
  <h1>SURAT IZIN</h1>
  <div class="subtitle">${escapeHtml(TYPE_LABEL[data.type])}</div>

  <table>
    <tr><td class="label">Nama Karyawan</td><td>: ${escapeHtml(data.employeeName)}</td></tr>
    <tr><td class="label">NIK</td><td>: ${escapeHtml(data.employeeNik)}</td></tr>
    <tr><td class="label">Tanggal</td><td>: ${escapeHtml(data.date)}</td></tr>
    <tr><td class="label">Jam</td><td>: ${escapeHtml(data.timeRequested)}</td></tr>
  </table>

  <div class="label">Alasan:</div>
  <div class="reason-box">${escapeHtml(data.reason)}</div>

  <div class="signature">
    <div class="block">
      <div>Disetujui, ${escapeHtml(data.issuedDate)}</div>
      <div class="name">${escapeHtml(data.approvedByName)}</div>
    </div>
  </div>
</body>
</html>`;
}
