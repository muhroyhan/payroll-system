import { Form, Input, Select, Switch } from 'antd';
import { enumSelectOptions } from '../../components/enumSelectOptions';
import { PAYSLIP_COMPONENT_TYPE_LABELS } from './labels';

// FE-T22 (09_FRONTEND_STEPS.md), §15.6 (08_FRONTEND_STRUCTURE.md). No
// ScopeSelector, no effective dates — payslip_component_master has neither
// field (verified against payslip-component.entity.ts); it's a flat
// {name, componentType, isTaxable, isBpjsEligible} constants table, unlike
// salary/incentive master (FE-T09/T10).
//
// R-06b (07_FRONTEND_RULES.md) — componentType/isTaxable/isBpjsEligible are
// now genuinely locked once referenced by a payslip line item (backend fix,
// payslip-components.service.ts's assertMutableFieldsUntouched). Still not
// derivable from this response (no isLocked flag), so this form does NOT
// pre-emptively disable anything — it submits as-is and lets FormDrawer's
// built-in conflict handling show the server's real 409 as a persistent
// modal. `name` is never locked, so it always saves regardless.
export function PayslipComponentFormFields() {
  return (
    <>
      <Form.Item
        name="name"
        label="Nama"
        rules={[{ required: true, message: 'Nama wajib diisi' }]}
      >
        <Input />
      </Form.Item>
      <Form.Item
        name="componentType"
        label="Tipe"
        rules={[{ required: true, message: 'Tipe wajib dipilih' }]}
      >
        <Select options={enumSelectOptions(PAYSLIP_COMPONENT_TYPE_LABELS)} />
      </Form.Item>
      <Form.Item name="isTaxable" label="Kena Pajak (PPh21)" valuePropName="checked">
        <Switch />
      </Form.Item>
      <Form.Item name="isBpjsEligible" label="Termasuk Basis BPJS" valuePropName="checked">
        <Switch />
      </Form.Item>
    </>
  );
}
