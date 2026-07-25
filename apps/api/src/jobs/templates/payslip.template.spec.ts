import { renderPayslipHtml } from './payslip.template';

describe('renderPayslipHtml', () => {
  it('renders one row per line item and foots to net pay', () => {
    const html = renderPayslipHtml({
      employeeName: 'Budi',
      employeeNik: 'NIK-1',
      period: '2026-11',
      lineItems: [
        { label: 'Gaji Pokok', amount: '8000000.00' },
        { label: 'Lembur', amount: '254335.00' },
        { label: 'PPh 21', amount: '-123800.00' },
        { label: 'BPJS (Karyawan)', amount: '-320000.00' },
      ],
      netPay: '7810535.00',
      issuedDate: '2026-11-25',
    });

    expect(html).toContain('Budi');
    expect(html).toContain('NIK-1');
    expect(html).toContain('Gaji Pokok');
    expect(html).toContain('Lembur');
    expect(html).toContain('Rp 254.335');
    expect(html).toContain('-Rp 123.800');
    expect(html).toContain('Rp 7.810.535');
  });

  it('escapes HTML in employee name', () => {
    const html = renderPayslipHtml({
      employeeName: '<script>alert(1)</script>',
      employeeNik: 'NIK-1',
      period: '2026-11',
      lineItems: [],
      netPay: '0.00',
      issuedDate: '2026-11-25',
    });

    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
  });
});
