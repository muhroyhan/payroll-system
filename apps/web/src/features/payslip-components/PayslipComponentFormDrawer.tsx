import { useEffect } from 'react';
import { Form } from 'antd';
import { FormDrawer } from '../../components/FormDrawer';
import { PayslipComponentFormFields } from './PayslipComponentFormFields';
import { useCreatePayslipComponentMutation, useUpdatePayslipComponentMutation } from './hooks';
import type { PayslipComponent, PayslipComponentFormValues } from './api';

interface PayslipComponentFormDrawerProps {
  open: boolean;
  onClose: () => void;
  /** Undefined = create mode. */
  component?: PayslipComponent;
}

// FE-T22 (09_FRONTEND_STEPS.md).
export function PayslipComponentFormDrawer({
  open,
  onClose,
  component,
}: PayslipComponentFormDrawerProps) {
  const [form] = Form.useForm<PayslipComponentFormValues>();
  const createMutation = useCreatePayslipComponentMutation();
  const updateMutation = useUpdatePayslipComponentMutation();

  useEffect(() => {
    if (!open) return;
    if (component) {
      form.setFieldsValue({
        name: component.name,
        componentType: component.componentType,
        isTaxable: component.isTaxable,
        isBpjsEligible: component.isBpjsEligible,
      });
    } else {
      form.resetFields();
    }
  }, [open, component, form]);

  const handleFinish = async (values: PayslipComponentFormValues) => {
    if (component) {
      await updateMutation.mutateAsync({ id: component.id, input: values });
    } else {
      await createMutation.mutateAsync(values);
    }
  };

  return (
    <FormDrawer<PayslipComponentFormValues>
      open={open}
      title={component ? 'Ubah Komponen Payslip' : 'Tambah Komponen Payslip'}
      onClose={onClose}
      onFinish={handleFinish}
      form={form}
      confirmLoading={createMutation.isPending || updateMutation.isPending}
    >
      <PayslipComponentFormFields editing={!!component} />
    </FormDrawer>
  );
}
