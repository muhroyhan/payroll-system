import { Col, DatePicker, Form, InputNumber, Row, Switch, type FormInstance } from 'antd';
import { ScopeSelector } from '../scope-resolver/ScopeSelector';
import type { IncentiveMasterFormRuntimeValues } from './formValues';

interface IncentiveMasterFormFieldsProps {
  form: FormInstance<IncentiveMasterFormRuntimeValues>;
}

// FE-T10 (09_FRONTEND_STEPS.md), §15.5 — same archetype/components as
// salary-master (FE-T09); the only real difference is the money field name
// and isBpjsEligible (§9 Step 2).
export function IncentiveMasterFormFields({ form }: IncentiveMasterFormFieldsProps) {
  return (
    <>
      <ScopeSelector form={form} />
      <Form.Item
        name="incentiveAmount"
        label="Nominal Insentif (Rp)"
        rules={[{ required: true, message: 'Nominal insentif wajib diisi' }]}
      >
        <InputNumber<number>
          style={{ width: '100%' }}
          min={0}
          formatter={(value) => `${value ?? ''}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
          parser={(value) => Number((value ?? '').replace(/,/g, ''))}
        />
      </Form.Item>
      <Form.Item
        name="isBpjsEligible"
        label="Termasuk Basis BPJS"
        valuePropName="checked"
        extra="Tunjangan tetap/rutin biasanya ya; insentif variabel/satu kali biasanya tidak (§9 Step 2)."
      >
        <Switch />
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
    </>
  );
}
