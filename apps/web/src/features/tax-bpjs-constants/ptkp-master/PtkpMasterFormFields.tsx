import { Col, DatePicker, Form, InputNumber, Row, Select } from 'antd';
import { enumSelectOptions } from '../../../components/enumSelectOptions';
import { RetireReasonFormItem } from '../../../components/RetireReasonFormItem';
import { PTKP_STATUS_LABELS } from '../../employees/labels';

// FE-T24 (09_FRONTEND_STEPS.md), §15.14 (08_FRONTEND_STRUCTURE.md). Reuses
// PTKP_STATUS_LABELS from features/employees/labels.ts (R-05 — one label
// map per enum) rather than duplicating it.
//
// isEdit gates the Alasan field (TAX-001): CreatePtkpMasterDto doesn't
// accept `reason` at all — showing the field on the create form invites
// filling it in, which the ValidationPipe's forbidNonWhitelisted then
// rejects with an opaque 400. Alasan is only ever meaningful when editing
// (it's required server-side specifically when the edit closes off
// effectiveEndDate).
export function PtkpMasterFormFields({ isEdit }: { isEdit: boolean }) {
  return (
    <>
      <Form.Item
        name="ptkpStatus"
        label="Status PTKP"
        rules={[{ required: true, message: 'Status PTKP wajib dipilih' }]}
      >
        <Select options={enumSelectOptions(PTKP_STATUS_LABELS)} />
      </Form.Item>
      <Form.Item
        name="amount"
        label="Nominal PTKP Tahunan (Rp)"
        rules={[{ required: true, message: 'Nominal wajib diisi' }]}
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
      {isEdit && <RetireReasonFormItem />}
    </>
  );
}
