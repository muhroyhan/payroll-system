import { DatePicker, Form, Input, InputNumber, Select } from 'antd';
import { useEmployeesQuery } from '../../employees/hooks';

// FE-T20 (09_FRONTEND_STEPS.md), §15.10 C (08_FRONTEND_STRUCTURE.md).
export function OvertimeLetterFormFields() {
  const employeesQuery = useEmployeesQuery();

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
        name="date"
        label="Tanggal"
        rules={[{ required: true, message: 'Tanggal wajib diisi' }]}
      >
        <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
      </Form.Item>
      <Form.Item
        name="plannedOvertimeHours"
        label="Jam Lembur Direncanakan"
        rules={[{ required: true, message: 'Jam lembur direncanakan wajib diisi' }]}
      >
        <InputNumber style={{ width: '100%' }} min={0} step={0.5} />
      </Form.Item>
      <Form.Item
        name="actualOvertimeHours"
        label="Jam Lembur Aktual"
        rules={[{ required: true, message: 'Jam lembur aktual wajib diisi' }]}
      >
        <InputNumber style={{ width: '100%' }} min={0} step={0.5} />
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
