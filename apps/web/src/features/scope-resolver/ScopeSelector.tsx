import { Col, Form, Row, Select, type FormInstance } from 'antd';
import type { ScopeType } from '@payroll-system/shared-types';
import { useScopeReferenceData } from './useScopeReferenceData';
import { SCOPE_TYPE_OPTIONS } from './labels';

export interface ScopeFormValues {
  scopeType: ScopeType;
  scopeValue: string;
}

interface ScopeSelectorProps<T extends ScopeFormValues> {
  form: FormInstance<T>;
}

// FE-T09 (09_FRONTEND_STEPS.md) — one component for "pick a scope_type, then
// a dependent scope_value" (§5.2), built once and reused as-is by
// salary-master (this task), incentive-master (FE-T10), and
// payslip_temp_components (FE-T23) — none of those need their own version.
export function ScopeSelector<T extends ScopeFormValues>({ form }: ScopeSelectorProps<T>) {
  const scopeType = Form.useWatch('scopeType', form) as ScopeType | undefined;
  const { optionsFor } = useScopeReferenceData();

  return (
    <Row gutter={16}>
      <Col span={12}>
        <Form.Item
          name="scopeType"
          label="Tingkat Cakupan"
          rules={[{ required: true, message: 'Tingkat cakupan wajib dipilih' }]}
        >
          <Select
            options={SCOPE_TYPE_OPTIONS}
            // `resetFields` wants a NamePath statically checked against the
            // generic T; 'scopeValue' is guaranteed by the ScopeFormValues
            // constraint but T's exact shape isn't known here (same class of
            // cast as FormDrawer's setFields — see components/FormDrawer.tsx).
            onChange={() => form.resetFields(['scopeValue'] as Parameters<typeof form.resetFields>[0])}
          />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item
          name="scopeValue"
          label="Berlaku Untuk"
          rules={[{ required: true, message: 'Nilai cakupan wajib dipilih' }]}
        >
          <Select
            disabled={!scopeType}
            showSearch
            optionFilterProp="label"
            options={optionsFor(scopeType)}
          />
        </Form.Item>
      </Col>
    </Row>
  );
}
