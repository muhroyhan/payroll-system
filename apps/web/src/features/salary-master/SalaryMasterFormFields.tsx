import { Col, DatePicker, Form, InputNumber, Row, type FormInstance } from 'antd';
import { ScopeSelector } from '../scope-resolver/ScopeSelector';
import { RetireReasonFormItem } from '../../components/RetireReasonFormItem';
import type { SalaryMasterFormRuntimeValues } from './formValues';

interface SalaryMasterFormFieldsProps {
  form: FormInstance<SalaryMasterFormRuntimeValues>;
}

// FE-T09 (09_FRONTEND_STEPS.md), §15.5 (08_FRONTEND_STRUCTURE.md).
export function SalaryMasterFormFields({ form }: SalaryMasterFormFieldsProps) {
  return (
    <>
      <ScopeSelector form={form} />
      <Form.Item
        name="baseSalary"
        label="Gaji Pokok (Rp)"
        rules={[{ required: true, message: 'Gaji pokok wajib diisi' }]}
      >
        <InputNumber<number>
          style={{ width: '100%' }}
          min={0}
          formatter={(value) => `${value ?? ''}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
          parser={(value) => Number((value ?? '').replace(/,/g, ''))}
        />
      </Form.Item>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="effectiveStartDate"
            label="Berlaku Sejak"
            rules={[{ required: true, message: 'Tanggal mulai berlaku wajib diisi' }]}
          >
            <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="effectiveEndDate" label="Berlaku Sampai">
            <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
          </Form.Item>
        </Col>
      </Row>
      <RetireReasonFormItem />
    </>
  );
}
