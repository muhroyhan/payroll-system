import { DatePicker, Form, Input, InputNumber, Select, Typography } from 'antd';
import { useEmployeesQuery } from '../../employees/hooks';
import { usePayslipComponentsQuery } from '../../payslip-components/hooks';
import { enumSelectOptions } from '../../../components/enumSelectOptions';
import { SP_LEVEL_LABELS } from './labels';

// FE-T19 (09_FRONTEND_STEPS.md), §15.10 B (08_FRONTEND_STRUCTURE.md).
export function SuratPeringatanFormFields() {
  const employeesQuery = useEmployeesQuery();
  // GET /payslip-components is admin-only (§15.6) — 403s for HR staff. The
  // sanction section degrades gracefully instead of showing a broken Select
  // (this is the role gap flagged in 06_FRONTEND_GENERAL.md §13.5, not
  // something to route around).
  const componentsQuery = usePayslipComponentsQuery();
  const sanctionUnavailable = componentsQuery.isError;

  return (
    <>
      <Form.Item
        name="employeeId"
        label="Karyawan"
        rules={[{ required: true, message: 'Karyawan wajib dipilih' }]}
      >
        <Select
          showSearch
          optionFilterProp="label"
          options={(employeesQuery.data ?? []).map((employee) => ({
            value: employee.id,
            label: employee.name,
          }))}
        />
      </Form.Item>
      <Form.Item
        name="level"
        label="Tingkat"
        rules={[{ required: true, message: 'Tingkat wajib dipilih' }]}
      >
        <Select options={enumSelectOptions(SP_LEVEL_LABELS)} />
      </Form.Item>
      <Form.Item
        name="issueDate"
        label="Tanggal Terbit"
        rules={[{ required: true, message: 'Tanggal terbit wajib diisi' }]}
      >
        <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
      </Form.Item>
      <Form.Item
        name="violationDescription"
        label="Uraian Pelanggaran"
        rules={[{ required: true, message: 'Uraian pelanggaran wajib diisi' }]}
      >
        <Input.TextArea rows={3} />
      </Form.Item>

      <Typography.Title level={5}>Sanksi (opsional)</Typography.Title>
      {sanctionUnavailable && (
        <Typography.Paragraph type="secondary">
          Hanya admin yang dapat memilih komponen sanksi. Simpan tanpa sanksi, atau minta admin
          menambahkannya.
        </Typography.Paragraph>
      )}
      <Form.Item
        name="sanctionComponentId"
        label="Komponen Sanksi"
        extra="Mengisi ini akan menjadi baris potongan pada payslip karyawan."
      >
        <Select
          allowClear
          disabled={sanctionUnavailable}
          options={(componentsQuery.data ?? []).map((component) => ({
            value: component.id,
            label: component.name,
          }))}
        />
      </Form.Item>
      <Form.Item name="sanctionAmount" label="Nominal Sanksi (Rp)">
        <InputNumber style={{ width: '100%' }} min={0} disabled={sanctionUnavailable} />
      </Form.Item>
    </>
  );
}
