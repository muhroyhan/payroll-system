import { SuratIjinType } from '@payroll-system/shared-types';
import { renderSuratIjinHtml } from './surat-ijin.template';

describe('renderSuratIjinHtml', () => {
  const baseData = {
    employeeName: 'Budi Santoso',
    employeeNik: '3201012345670001',
    date: '2026-07-20',
    type: SuratIjinType.LATE_ARRIVAL,
    reason: 'Macet parah di tol',
    timeRequested: '09:30',
    approvedByName: 'Siti HR',
    issuedDate: '2026-07-23',
  };

  it('embeds all the letter data as valid HTML', () => {
    const html = renderSuratIjinHtml(baseData);
    expect(html).toContain('Budi Santoso');
    expect(html).toContain('3201012345670001');
    expect(html).toContain('2026-07-20');
    expect(html).toContain('09:30');
    expect(html).toContain('Macet parah di tol');
    expect(html).toContain('Siti HR');
    expect(html).toContain('<!doctype html>');
  });

  it('maps each SuratIjinType to a readable label', () => {
    const lateArrival = renderSuratIjinHtml(baseData);
    expect(lateArrival).toContain('Late Arrival');

    const earlyLeave = renderSuratIjinHtml({
      ...baseData,
      type: SuratIjinType.EARLY_LEAVE,
    });
    expect(earlyLeave).toContain('Early Leave');
  });

  it('escapes HTML special characters in free-text fields (no injection into the letter)', () => {
    const html = renderSuratIjinHtml({
      ...baseData,
      reason: '<script>alert("x")</script> & "quoted"',
    });
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('&amp;');
    expect(html).toContain('&quot;quoted&quot;');
  });
});
