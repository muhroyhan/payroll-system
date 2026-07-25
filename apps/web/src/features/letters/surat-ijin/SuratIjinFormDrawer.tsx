import { useEffect } from 'react';
import { Form } from 'antd';
import { FormDrawer } from '../../../components/FormDrawer';
import { SuratIjinFormFields } from './SuratIjinFormFields';
import { useCreateSuratIjinMutation, useUpdateSuratIjinMutation } from './hooks';
import {
  runtimeFormValuesToApi,
  suratIjinToRuntimeFormValues,
  type SuratIjinFormRuntimeValues,
} from './formValues';
import type { SuratIjin } from './api';

interface SuratIjinFormDrawerProps {
  open: boolean;
  onClose: () => void;
  /** Undefined = create mode. Only reachable while status = pending — the
   *  trigger (LockedAction on the detail page, R-06a) already covers that. */
  suratIjin?: SuratIjin;
}

// FE-T18 (09_FRONTEND_STEPS.md).
export function SuratIjinFormDrawer({ open, onClose, suratIjin }: SuratIjinFormDrawerProps) {
  const [form] = Form.useForm<SuratIjinFormRuntimeValues>();
  const createMutation = useCreateSuratIjinMutation();
  const updateMutation = useUpdateSuratIjinMutation(suratIjin?.id ?? '');

  useEffect(() => {
    if (!open) return;
    if (suratIjin) {
      form.setFieldsValue(suratIjinToRuntimeFormValues(suratIjin));
    } else {
      form.resetFields();
    }
  }, [open, suratIjin, form]);

  const handleFinish = async (values: SuratIjinFormRuntimeValues) => {
    const payload = runtimeFormValuesToApi(values);
    if (suratIjin) {
      await updateMutation.mutateAsync(payload);
    } else {
      await createMutation.mutateAsync(payload);
    }
  };

  return (
    <FormDrawer<SuratIjinFormRuntimeValues>
      open={open}
      title={suratIjin ? 'Ubah Surat Ijin' : 'Ajukan Surat Ijin'}
      onClose={onClose}
      onFinish={handleFinish}
      form={form}
      confirmLoading={createMutation.isPending || updateMutation.isPending}
    >
      <SuratIjinFormFields />
    </FormDrawer>
  );
}
