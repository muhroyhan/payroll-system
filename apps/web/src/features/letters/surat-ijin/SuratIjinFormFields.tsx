import { DatePicker, Form, Input, Select, TimePicker } from 'antd';
import { EmployeeSelect } from '../../employees/EmployeeSelect';
import { enumSelectOptions } from '../../../components/enumSelectOptions';
import { SURAT_IJIN_TYPE_LABELS } from './labels';

// FE-T18 (09_FRONTEND_STEPS.md), §15.10 A (08_FRONTEND_STRUCTURE.md).
export function SuratIjinFormFields() {
  return (
    <>
      <Form.Item
        name="employeeId"
        label="Karyawan"
        rules={[{ required: true, message: 'Karyawan wajib dipilih' }]}
      >
        <EmployeeSelect />
      </Form.Item>
      <Form.Item
        name="type"
        label="Jenis"
        rules={[{ required: true, message: 'Jenis wajib dipilih' }]}
      >
        <Select options={enumSelectOptions(SURAT_IJIN_TYPE_LABELS)} />
      </Form.Item>
      <Form.Item
        name="date"
        label="Tanggal"
        rules={[{ required: true, message: 'Tanggal wajib diisi' }]}
      >
        <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
      </Form.Item>
      <Form.Item
        name="timeRequested"
        label="Jam"
        rules={[{ required: true, message: 'Jam wajib diisi' }]}
      >
        <TimePicker style={{ width: '100%' }} format="HH:mm" />
      </Form.Item>
      <Form.Item
        name="reason"
        label="Alasan"
        rules={[{ required: true, message: 'Alasan wajib diisi' }]}
      >
        <Input.TextArea rows={3} />
      </Form.Item>
    </>
  );
}
