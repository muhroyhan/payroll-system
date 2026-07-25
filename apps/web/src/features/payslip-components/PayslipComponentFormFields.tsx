import { Alert, Form, Input, Select, Switch } from 'antd';
import { enumSelectOptions } from '../../components/enumSelectOptions';
import { PAYSLIP_COMPONENT_TYPE_LABELS } from './labels';

interface PayslipComponentFormFieldsProps {
  /** True when editing (not creating) — shows the immutability caveat
   *  described in api.ts's note (the backend documents a lock here but
   *  doesn't actually enforce one). */
  editing?: boolean;
}

// FE-T22 (09_FRONTEND_STEPS.md), §15.6 (08_FRONTEND_STRUCTURE.md). No
// ScopeSelector, no effective dates — payslip_component_master has neither
// field (verified against payslip-component.entity.ts); it's a flat
// {name, componentType, isTaxable, isBpjsEligible} constants table, unlike
// salary/incentive master (FE-T09/T10).
export function PayslipComponentFormFields({ editing = false }: PayslipComponentFormFieldsProps) {
  return (
    <>
      {editing && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          message="Berhati-hati mengubah tipe/pajak/BPJS komponen yang sudah pernah dipakai"
          description="Payslip yang sudah dibuat memakai nilai komponen ini apa adanya saat itu — mengubahnya di sini tidak mengubah payslip lama, tapi dapat membuat riwayat tampak tidak konsisten. Sistem saat ini tidak mencegah perubahan ini secara otomatis."
        />
      )}
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
