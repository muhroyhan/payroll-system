import { useEffect } from 'react';
import { Form } from 'antd';
import { FormDrawer } from '../../../components/FormDrawer';
import { useAuth } from '../../auth/useAuth';
import { SuratPeringatanFormFields } from './SuratPeringatanFormFields';
import { useCreateSuratPeringatanMutation, useUpdateSuratPeringatanMutation } from './hooks';
import {
  runtimeFormValuesToApi,
  suratPeringatanToRuntimeFormValues,
  type SuratPeringatanFormRuntimeValues,
} from './formValues';
import type { SuratPeringatan } from './api';

interface SuratPeringatanFormDrawerProps {
  open: boolean;
  onClose: () => void;
  /** Undefined = create mode. R-06b (07_FRONTEND_RULES.md): this drawer is
   *  NEVER pre-emptively disabled by a client-side lock check — the
   *  payslip-reference lock isn't derivable from the record (§13.5 B-06).
   *  Submitting a locked record's edit is expected to sometimes 409; that's
   *  handled by FormDrawer's built-in conflict modal, not prevented here. */
  suratPeringatan?: SuratPeringatan;
}

// FE-T19 (09_FRONTEND_STEPS.md).
export function SuratPeringatanFormDrawer({
  open,
  onClose,
  suratPeringatan,
}: SuratPeringatanFormDrawerProps) {
  const { user } = useAuth();
  const [form] = Form.useForm<SuratPeringatanFormRuntimeValues>();
  const createMutation = useCreateSuratPeringatanMutation();
  const updateMutation = useUpdateSuratPeringatanMutation(suratPeringatan?.id ?? '');

  useEffect(() => {
    if (!open) return;
    if (suratPeringatan) {
      form.setFieldsValue(suratPeringatanToRuntimeFormValues(suratPeringatan));
    } else {
      form.resetFields();
    }
  }, [open, suratPeringatan, form]);

  const handleFinish = async (values: SuratPeringatanFormRuntimeValues) => {
    // issuedBy is always the current user — see formValues.ts's note.
    const payload = runtimeFormValuesToApi(values, user?.id ?? '');
    if (suratPeringatan) {
      await updateMutation.mutateAsync(payload);
    } else {
      await createMutation.mutateAsync(payload);
    }
  };

  return (
    <FormDrawer<SuratPeringatanFormRuntimeValues>
      open={open}
      title={suratPeringatan ? 'Ubah Surat Peringatan' : 'Terbitkan Surat Peringatan'}
      onClose={onClose}
      onFinish={handleFinish}
      form={form}
      confirmLoading={createMutation.isPending || updateMutation.isPending}
    >
      <SuratPeringatanFormFields />
    </FormDrawer>
  );
}
