import { Col, DatePicker, Form, InputNumber, Row } from 'antd';

const rateField = (name: string, label: string) => (
  <Col span={12} key={name}>
    <Form.Item name={name} label={label} rules={[{ required: true, message: `${label} wajib diisi` }]}>
      <InputNumber style={{ width: '100%' }} min={0} max={1} step={0.0001} />
    </Form.Item>
  </Col>
);

// FE-T24 (09_FRONTEND_STEPS.md), §15.14 (08_FRONTEND_STRUCTURE.md). One
// "rate card" bundling JHT/JP/JKK/JKM, matching the entity — not four
// separate masters.
export function BpjsKetenagakerjaanMasterFormFields() {
  return (
    <>
      <Row gutter={16}>
        {rateField('jhtEmployeeRate', 'JHT — Tarif Karyawan')}
        {rateField('jhtCompanyRate', 'JHT — Tarif Perusahaan')}
      </Row>
      <Row gutter={16}>
        {rateField('jpEmployeeRate', 'JP — Tarif Karyawan')}
        {rateField('jpCompanyRate', 'JP — Tarif Perusahaan')}
      </Row>
      <Form.Item
        name="jpWageCap"
        label="JP — Batas Upah (Rp)"
        rules={[{ required: true, message: 'Batas upah JP wajib diisi' }]}
      >
        <InputNumber style={{ width: '100%' }} min={0} />
      </Form.Item>
      <Row gutter={16}>
        {rateField('jkkCompanyRate', 'JKK — Tarif Perusahaan')}
        {rateField('jkmCompanyRate', 'JKM — Tarif Perusahaan')}
      </Row>
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
