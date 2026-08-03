import { useEffect } from 'react';
import { Form } from 'antd';
import { FormDrawer } from '../../components/FormDrawer';
import { KasbonFormFields } from './KasbonFormFields';
import { useCreateKasbonMutation, useUpdateKasbonMutation } from './hooks';
import {
  kasbonToRuntimeFormValues,
  runtimeFormValuesToApi,
  type KasbonFormRuntimeValues,
} from './formValues';
import { hasDeductionStarted, type Kasbon } from './api';

interface KasbonFormDrawerProps {
  open: boolean;
  onClose: () => void;
  /** Undefined = create mode. Whether this can even be opened for an
   *  existing record (dead-end statuses) is decided by the trigger
   *  (LockedAction on the detail page, R-06a) — this component doesn't
   *  re-check that. It DOES still freeze the money fields specifically once
   *  a deduction has started, since that's a narrower, independent lock. */
  kasbon?: Kasbon;
}

// FE-T21 (09_FRONTEND_STEPS.md).
export function KasbonFormDrawer({ open, onClose, kasbon }: KasbonFormDrawerProps) {
  const [form] = Form.useForm<KasbonFormRuntimeValues>();
  const createMutation = useCreateKasbonMutation();
  const updateMutation = useUpdateKasbonMutation(kasbon?.id ?? '');

  useEffect(() => {
    if (!open) return;
    if (kasbon) {
      form.setFieldsValue(kasbonToRuntimeFormValues(kasbon));
    } else {
      form.resetFields();
    }
  }, [open, kasbon, form]);

  const handleFinish = async (values: KasbonFormRuntimeValues) => {
    const payload = runtimeFormValuesToApi(values);
    if (kasbon) {
      await updateMutation.mutateAsync(payload);
    } else {
      await createMutation.mutateAsync(payload);
    }
  };

  return (
    <FormDrawer<KasbonFormRuntimeValues>
      open={open}
      title={kasbon ? 'Ubah Kasbon' : 'Ajukan Kasbon'}
      onClose={onClose}
      onFinish={handleFinish}
      form={form}
      confirmLoading={createMutation.isPending || updateMutation.isPending}
    >
      <KasbonFormFields
        moneyFieldsLocked={kasbon ? hasDeductionStarted(kasbon) : false}
        isEditMode={!!kasbon}
      />
    </FormDrawer>
  );
}
