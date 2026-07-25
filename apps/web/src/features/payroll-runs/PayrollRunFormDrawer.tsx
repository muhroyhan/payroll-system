import { useEffect } from 'react';
import { DatePicker, Form } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { FormDrawer } from '../../components/FormDrawer';
import { useCreatePayrollRunMutation } from './hooks';
import type { PayrollRunFormValues } from './api';

interface PayrollRunFormRuntimeValues {
  period: Dayjs;
}

interface PayrollRunFormDrawerProps {
  open: boolean;
  onClose: () => void;
}

// FE-T26 (09_FRONTEND_STEPS.md). CreatePayrollRunDto has exactly ONE field
// (period, 'YYYY-MM') — verified against create-payroll-run.dto.ts. No
// separate date field exists, so this form is a single month picker, not
// "period + tanggal".
export function PayrollRunFormDrawer({ open, onClose }: PayrollRunFormDrawerProps) {
  const [form] = Form.useForm<PayrollRunFormRuntimeValues>();
  const createMutation = useCreatePayrollRunMutation();

  useEffect(() => {
    if (open) {
      form.resetFields();
    }
  }, [open, form]);

  const handleFinish = async (values: PayrollRunFormRuntimeValues) => {
    const payload: PayrollRunFormValues = { period: values.period.format('YYYY-MM') };
    await createMutation.mutateAsync(payload);
  };

  return (
    <FormDrawer<PayrollRunFormRuntimeValues>
      open={open}
      title="Buat Payroll Run"
      onClose={onClose}
      onFinish={handleFinish}
      form={form}
      confirmLoading={createMutation.isPending}
    >
      <Form.Item
        name="period"
        label="Periode"
        initialValue={dayjs()}
        rules={[{ required: true, message: 'Periode wajib diisi' }]}
      >
        <DatePicker picker="month" style={{ width: '100%' }} format="YYYY-MM" allowClear={false} />
      </Form.Item>
    </FormDrawer>
  );
}
