import { SPLevel } from '@payroll-system/shared-types';
import { renderSuratPeringatanHtml } from './surat-peringatan.template';

describe('renderSuratPeringatanHtml', () => {
  function baseData() {
    return {
      employeeName: 'Budi Santoso',
      employeeNik: 'NIK-001',
      level: SPLevel.SP2,
      violationDescription: 'Terlambat berulang kali',
      issueDate: '2026-07-23',
      sanctionComponentName: null,
      sanctionAmount: null,
      issuedByName: 'HR Manager',
    };
  }

  it('embeds employee, level, and violation data', () => {
    const html = renderSuratPeringatanHtml(baseData());
    expect(html).toContain('Budi Santoso');
    expect(html).toContain('NIK-001');
    expect(html).toContain('Terlambat berulang kali');
    expect(html).toContain('2026-07-23');
  });

  it('maps SP level to its Indonesian label', () => {
    const html = renderSuratPeringatanHtml({
      ...baseData(),
      level: SPLevel.SP3,
    });
    expect(html).toContain('Surat Peringatan Ketiga (SP3)');
  });

  it('renders the sanction line when component and amount are present', () => {
    const html = renderSuratPeringatanHtml({
      ...baseData(),
      sanctionComponentName: 'Potongan Disiplin',
      sanctionAmount: '500000.00',
    });
    expect(html).toContain('Potongan Disiplin');
    expect(html).toContain('500000.00');
  });

  it('renders a placeholder dash when there is no sanction', () => {
    const html = renderSuratPeringatanHtml(baseData());
    expect(html).toContain('Sanksi</td><td>: -</td>');
  });

  it('escapes HTML in the violation description to prevent injection', () => {
    const html = renderSuratPeringatanHtml({
      ...baseData(),
      violationDescription: '<script>alert(1)</script>',
    });
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
  });
});
