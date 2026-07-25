import { DatePicker, Form, InputNumber, Select, Tooltip } from 'antd';
import { useEmployeesQuery } from '../employees/hooks';

interface KasbonFormFieldsProps {
  /** True once at least one installment has been deducted (§11) — freezes
   *  amount/installmentCount/installmentAmount specifically; requestDate
   *  stays editable. Fully derivable (R-06a), see api.ts's hasDeductionStarted. */
  moneyFieldsLocked?: boolean;
}

const LOCK_TOOLTIP =
  'Sudah ada cicilan yang terpotong — buat kasbon baru untuk koreksi (§11).';

function MoneyField({
  name,
  label,
  min,
  locked,
}: {
  name: string;
  label: string;
  min: number;
  locked: boolean;
}) {
  const input = <InputNumber style={{ width: '100%' }} min={min} disabled={locked} />;
  return (
    <Form.Item name={name} label={label} rules={[{ required: true, message: `${label} wajib diisi` }]}>
      {locked ? <Tooltip title={LOCK_TOOLTIP}>{input}</Tooltip> : input}
    </Form.Item>
  );
}

// FE-T21 (09_FRONTEND_STEPS.md), §15.11 (08_FRONTEND_STRUCTURE.md).
export function KasbonFormFields({ moneyFieldsLocked = false }: KasbonFormFieldsProps) {
  const employeesQuery = useEmployeesQuery();

  return (
    <>
      <Form.Item
        name="employeeId"
        label="Karyawan"
        rules={[{ required: true, message: 'Karyawan wajib dipilih' }]}
      >
        <Select
          showSearch
          optionFilterProp="label"
          options={(employeesQuery.data ?? []).map((employee) => ({
            value: employee.id,
            label: employee.name,
          }))}
        />
      </Form.Item>
      <MoneyField name="amount" label="Jumlah Kasbon (Rp)" min={0} locked={moneyFieldsLocked} />
      <Form.Item
        name="requestDate"
        label="Tanggal Permintaan"
        rules={[{ required: true, message: 'Tanggal permintaan wajib diisi' }]}
      >
        <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
      </Form.Item>
      <MoneyField
        name="installmentCount"
        label="Jumlah Cicilan"
        min={1}
        locked={moneyFieldsLocked}
      />
      <MoneyField
        name="installmentAmount"
        label="Nominal per Cicilan (Rp)"
        min={0}
        locked={moneyFieldsLocked}
      />
    </>
  );
}
