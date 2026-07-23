import { renderOvertimeLetterHtml } from './overtime-letter.template';

describe('renderOvertimeLetterHtml', () => {
  function baseData() {
    return {
      employeeName: 'Budi Santoso',
      employeeNik: 'NIK-001',
      date: '2026-07-23',
      plannedOvertimeHours: '3.00',
      actualOvertimeHours: '2.50',
      reason: 'Menyelesaikan laporan bulanan',
      verifiedByName: 'HR Manager',
      verifiedDate: '2026-07-24',
    };
  }

  it('embeds employee, date, and hours data', () => {
    const html = renderOvertimeLetterHtml(baseData());
    expect(html).toContain('Budi Santoso');
    expect(html).toContain('NIK-001');
    expect(html).toContain('2026-07-23');
    expect(html).toContain('3.00');
    expect(html).toContain('2.50');
  });

  it('embeds the reason and verifier name', () => {
    const html = renderOvertimeLetterHtml(baseData());
    expect(html).toContain('Menyelesaikan laporan bulanan');
    expect(html).toContain('HR Manager');
  });

  it('escapes HTML in the reason to prevent injection', () => {
    const html = renderOvertimeLetterHtml({
      ...baseData(),
      reason: '<script>alert(1)</script>',
    });
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
  });
});
