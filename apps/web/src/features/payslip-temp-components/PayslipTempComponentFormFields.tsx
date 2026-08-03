import { Col, Form, InputNumber, Row, Select, Typography, type FormInstance } from 'antd';
import { MONTH_OPTIONS } from '@payroll-system/shared-types';
import { ScopeSelector } from '../scope-resolver/ScopeSelector';
import { YearSelect } from '../../components/YearSelect';
import { usePayslipComponentsQuery } from '../payslip-components/hooks';
import type { PayslipComponent } from '../payslip-components/api';
import type { PayslipTempComponentFormRuntimeValues } from './formValues';

interface PayslipTempComponentFormFieldsProps {
  form: FormInstance<PayslipTempComponentFormRuntimeValues>;
  /** The record's already-known component (edit mode only) — used as a
   *  fallback option when GET /payslip-components 403s for HR staff, so an
   *  existing selection still displays correctly even though the full list
   *  can't be fetched. */
  currentComponent?: PayslipComponent;
}

// FE-T23 (09_FRONTEND_STEPS.md), §15.6 (08_FRONTEND_STRUCTURE.md). Reuses
// ScopeSelector (FE-T09) — verified this entity genuinely has
// scopeType/scopeValue (payslip-temp-component.entity.ts), unlike
// payslip_component_master (FE-T22), which has neither.
export function PayslipTempComponentFormFields({
  form,
  currentComponent,
}: PayslipTempComponentFormFieldsProps) {
  // GET /payslip-components is admin-only (§15.6) — 403s for HR staff. Since
  // componentId is REQUIRED here (unlike surat-peringatan's optional
  // sanction), an HR user who can't load the list genuinely cannot create a
  // new temp component — the form says so plainly instead of pretending a
  // broken Select works.
  const componentsQuery = usePayslipComponentsQuery();
  const componentsUnavailable = componentsQuery.isError;

  const options = componentsUnavailable
    ? currentComponent
      ? [{ value: currentComponent.id, label: currentComponent.name }]
      : []
    : (componentsQuery.data ?? []).map((component) => ({
        value: component.id,
        label: component.name,
      }));

  return (
    <>
      {componentsUnavailable && !currentComponent && (
        <Typography.Paragraph type="danger">
          Hanya admin yang dapat memuat daftar komponen payslip — komponen sementara baru tidak
          dapat dibuat dari sini. Minta admin membuatkannya, atau login sebagai admin.
        </Typography.Paragraph>
      )}
      {componentsUnavailable && currentComponent && (
        <Typography.Paragraph type="secondary">
          Hanya admin yang dapat mengganti komponen — kolom ini terkunci ke pilihan yang sudah
          ada.
        </Typography.Paragraph>
      )}
      <Form.Item
        name="componentId"
        label="Komponen"
        rules={[{ required: true, message: 'Komponen wajib dipilih' }]}
      >
        <Select disabled={componentsUnavailable} options={options} />
      </Form.Item>
      <ScopeSelector form={form} />
      <Form.Item
        name="amount"
        label="Nominal (Rp)"
        rules={[{ required: true, message: 'Nominal wajib diisi' }]}
      >
        <InputNumber style={{ width: '100%' }} min={0} />
      </Form.Item>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="periodYear"
            label="Tahun"
            rules={[{ required: true, message: 'Tahun wajib diisi' }]}
          >
            <YearSelect style={{ width: '100%' }} />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="periodMonth"
            label="Bulan"
            rules={[{ required: true, message: 'Bulan wajib diisi' }]}
          >
            <Select style={{ width: '100%' }} options={MONTH_OPTIONS} />
          </Form.Item>
        </Col>
      </Row>
    </>
  );
}
