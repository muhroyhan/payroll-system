import { useEffect } from 'react';
import { Form } from 'antd';
import { FormDrawer } from '../../components/FormDrawer';
import { PayslipTempComponentFormFields } from './PayslipTempComponentFormFields';
import {
  useCreatePayslipTempComponentMutation,
  useUpdatePayslipTempComponentMutation,
} from './hooks';
import {
  runtimeFormValuesToApi,
  tempComponentToRuntimeFormValues,
  type PayslipTempComponentFormRuntimeValues,
} from './formValues';
import type { PayslipTempComponent } from './api';

interface PayslipTempComponentFormDrawerProps {
  open: boolean;
  onClose: () => void;
  /** Undefined = create mode. */
  tempComponent?: PayslipTempComponent;
}

// FE-T23 (09_FRONTEND_STEPS.md).
export function PayslipTempComponentFormDrawer({
  open,
  onClose,
  tempComponent,
}: PayslipTempComponentFormDrawerProps) {
  const [form] = Form.useForm<PayslipTempComponentFormRuntimeValues>();
  const createMutation = useCreatePayslipTempComponentMutation();
  const updateMutation = useUpdatePayslipTempComponentMutation(tempComponent?.id ?? '');

  useEffect(() => {
    if (!open) return;
    if (tempComponent) {
      form.setFieldsValue(tempComponentToRuntimeFormValues(tempComponent));
    } else {
      form.resetFields();
    }
  }, [open, tempComponent, form]);

  const handleFinish = async (values: PayslipTempComponentFormRuntimeValues) => {
    const payload = runtimeFormValuesToApi(values);
    if (tempComponent) {
      await updateMutation.mutateAsync(payload);
    } else {
      await createMutation.mutateAsync(payload);
    }
  };

  return (
    <FormDrawer<PayslipTempComponentFormRuntimeValues>
      open={open}
      title={tempComponent ? 'Ubah Komponen Sementara' : 'Tambah Komponen Sementara'}
      onClose={onClose}
      onFinish={handleFinish}
      form={form}
      confirmLoading={createMutation.isPending || updateMutation.isPending}
    >
      <PayslipTempComponentFormFields form={form} currentComponent={tempComponent?.component} />
    </FormDrawer>
  );
}
