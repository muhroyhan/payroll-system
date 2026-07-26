import { Col, DatePicker, Form, InputNumber, Row, Select } from 'antd';
import { enumSelectOptions } from '../../../components/enumSelectOptions';
import { RetireReasonFormItem } from '../../../components/RetireReasonFormItem';
import { TER_CATEGORY_LABELS } from './labels';

// FE-T24 (09_FRONTEND_STEPS.md), §15.14 (08_FRONTEND_STRUCTURE.md).
export function TerBracketMasterFormFields() {
  return (
    <>
      <Form.Item
        name="terCategory"
        label="Kategori TER"
        rules={[{ required: true, message: 'Kategori wajib dipilih' }]}
      >
        <Select options={enumSelectOptions(TER_CATEGORY_LABELS)} />
      </Form.Item>
      <Form.Item
        name="incomeLowerBound"
        label="Batas Bawah Penghasilan (Rp)"
        rules={[{ required: true, message: 'Batas bawah wajib diisi' }]}
      >
        <InputNumber style={{ width: '100%' }} min={0} />
      </Form.Item>
      <Form.Item
        name="incomeUpperBound"
        label="Batas Atas Penghasilan (Rp)"
        extra="Kosongkan untuk bracket tertinggi (tidak ada batas atas)."
      >
        <InputNumber style={{ width: '100%' }} min={0} />
      </Form.Item>
      <Form.Item
        name="rate"
        label="Tarif (fraksi, mis. 0.0678 = 6,78%)"
        rules={[{ required: true, message: 'Tarif wajib diisi' }]}
      >
        <InputNumber style={{ width: '100%' }} min={0} max={1} step={0.0001} />
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
