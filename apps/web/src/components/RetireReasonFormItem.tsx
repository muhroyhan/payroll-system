import { Form, Input } from 'antd';

// Audit-trail follow-up (§1C) — shared by every effective-dated master's
// edit form (salary, incentive, ptkp, ter-bracket, bpjs-kesehatan,
// bpjs-ketenagakerjaan, leave-policy). The backend only enforces this as
// required when the update actually closes off effectiveEndDate (a manual
// retire) — the field stays optional here too, since the same form is used
// for every other edit; a 400 from the server is the real gate, this is
// just where the value is collected.
export function RetireReasonFormItem() {
  return (
    <Form.Item
      name="reason"
      label="Alasan (wajib bila mengakhiri masa berlaku / mengisi Berlaku Sampai)"
    >
      <Input.TextArea
        rows={2}
        placeholder="Jelaskan kenapa baris ini diakhiri masa berlakunya, mis. digantikan aturan baru…"
      />
    </Form.Item>
  );
}
