import { useEffect } from 'react';
import { Form } from 'antd';
import { FormDrawer } from '../../../components/FormDrawer';
import { OvertimeLetterFormFields } from './OvertimeLetterFormFields';
import { useCreateOvertimeLetterMutation, useUpdateOvertimeLetterMutation } from './hooks';
import {
  overtimeLetterToRuntimeFormValues,
  runtimeFormValuesToApi,
  type OvertimeLetterFormRuntimeValues,
} from './formValues';
import type { OvertimeLetter } from './api';

interface OvertimeLetterFormDrawerProps {
  open: boolean;
  onClose: () => void;
  /** Undefined = create mode. R-06b (07_FRONTEND_RULES.md) — this drawer is
   *  never pre-emptively disabled by a client-side lock check; the
   *  payslip-reference lock (independent of `status`) isn't derivable from
   *  the record (§13.5 B-06). A locked letter's edit attempt 409s through
   *  FormDrawer's built-in conflict modal. */
  overtimeLetter?: OvertimeLetter;
}

// FE-T20 (09_FRONTEND_STEPS.md).
export function OvertimeLetterFormDrawer({
  open,
  onClose,
  overtimeLetter,
}: OvertimeLetterFormDrawerProps) {
  const [form] = Form.useForm<OvertimeLetterFormRuntimeValues>();
  const createMutation = useCreateOvertimeLetterMutation();
  const updateMutation = useUpdateOvertimeLetterMutation(overtimeLetter?.id ?? '');

  useEffect(() => {
    if (!open) return;
    if (overtimeLetter) {
      form.setFieldsValue(overtimeLetterToRuntimeFormValues(overtimeLetter));
    } else {
      form.resetFields();
    }
  }, [open, overtimeLetter, form]);

  const handleFinish = async (values: OvertimeLetterFormRuntimeValues) => {
    const payload = runtimeFormValuesToApi(values);
    if (overtimeLetter) {
      await updateMutation.mutateAsync(payload);
    } else {
      await createMutation.mutateAsync(payload);
    }
  };

  return (
    <FormDrawer<OvertimeLetterFormRuntimeValues>
      open={open}
      title={overtimeLetter ? 'Ubah Surat Lembur' : 'Ajukan Surat Lembur'}
      onClose={onClose}
      onFinish={handleFinish}
      form={form}
      confirmLoading={createMutation.isPending || updateMutation.isPending}
    >
      <OvertimeLetterFormFields />
    </FormDrawer>
  );
}
