import { Col, DatePicker, Form, InputNumber, Row, Select, type FormInstance } from 'antd';
import { ScopeSelector } from '../../scope-resolver/ScopeSelector';
import { RetireReasonFormItem } from '../../../components/RetireReasonFormItem';
import { useLeaveTypesQuery } from '../leave-types/hooks';
import type { LeavePolicyMasterFormRuntimeValues } from './formValues';

interface LeavePolicyMasterFormFieldsProps {
  form: FormInstance<LeavePolicyMasterFormRuntimeValues>;
}

// FE-T12 (09_FRONTEND_STEPS.md), §15.9 (08_FRONTEND_STRUCTURE.md). Same
// ScopeSelector as salary/incentive master (FE-T09); the only addition is
// the leaveTypeId select, since a policy is scoped per leave type too.
export function LeavePolicyMasterFormFields({ form }: LeavePolicyMasterFormFieldsProps) {
  const leaveTypesQuery = useLeaveTypesQuery();

  return (
    <>
      <Form.Item
        name="leaveTypeId"
        label="Jenis Cuti"
        rules={[{ required: true, message: 'Jenis cuti wajib dipilih' }]}
      >
        <Select
          options={(leaveTypesQuery.data ?? []).map((type) => ({
            value: type.id,
            label: type.name,
          }))}
        />
      </Form.Item>
      <ScopeSelector form={form} />
      <Form.Item
        name="annualQuota"
        label="Kuota Tahunan (hari)"
        rules={[{ required: true, message: 'Kuota tahunan wajib diisi' }]}
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
