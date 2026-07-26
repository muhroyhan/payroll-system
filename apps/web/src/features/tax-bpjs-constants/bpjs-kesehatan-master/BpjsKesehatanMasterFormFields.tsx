import { Col, DatePicker, Form, InputNumber, Row } from 'antd';
import { RetireReasonFormItem } from '../../../components/RetireReasonFormItem';

// FE-T24 (09_FRONTEND_STEPS.md), §15.14 (08_FRONTEND_STRUCTURE.md).
export function BpjsKesehatanMasterFormFields() {
  return (
    <>
      <Form.Item
        name="employeeRate"
        label="Tarif Karyawan (fraksi, mis. 0.0123 = 1,23%)"
        rules={[{ required: true, message: 'Tarif karyawan wajib diisi' }]}
      >
        <InputNumber style={{ width: '100%' }} min={0} max={1} step={0.0001} />
      </Form.Item>
      <Form.Item
        name="companyRate"
        label="Tarif Perusahaan (fraksi, mis. 0.0456 = 4,56%)"
        rules={[{ required: true, message: 'Tarif perusahaan wajib diisi' }]}
      >
        <InputNumber style={{ width: '100%' }} min={0} max={1} step={0.0001} />
      </Form.Item>
      <Form.Item
        name="wageCap"
        label="Batas Upah (Rp)"
        rules={[{ required: true, message: 'Batas upah wajib diisi' }]}
      >
        <InputNumber style={{ width: '100%' }} min={0} />
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
