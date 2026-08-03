import { useEffect, useState } from 'react';
import { Alert, Button, DatePicker, Drawer, Form, Space } from 'antd';
import type { Dayjs } from 'dayjs';
import { EmployeeSelect } from '../../employees/EmployeeSelect';
import { useReconcileAttendanceMutation } from './hooks';
import { confirmOverwrite } from './confirmOverwrite';
import { describeApiError, type ApiErrorPresentation } from '../../../api/errors';

const { RangePicker } = DatePicker;

interface ReconcileFormValues {
  employeeId: string;
  range: [Dayjs, Dayjs];
}

interface ReconcileDrawerProps {
  open: boolean;
  onClose: () => void;
}

// FE-T17 (09_FRONTEND_STEPS.md), §15.8 C. Same reasoning as
// AttendanceManualEntryDrawer.tsx for not using the shared FormDrawer
// archetype: a reconcile 409 means "ask, then retry with overwrite," and
// reconcileRange() is all-or-nothing across the whole date range (a single
// conflicting day aborts the entire call — see api.ts's note), so the
// confirm applies to the whole range in one dialog, not per day.
export function ReconcileDrawer({ open, onClose }: ReconcileDrawerProps) {
  const [form] = Form.useForm<ReconcileFormValues>();
  const reconcileMutation = useReconcileAttendanceMutation();
  const [error, setError] = useState<ApiErrorPresentation | null>(null);

  useEffect(() => {
    if (open) {
      form.resetFields();
      setError(null);
    }
  }, [open, form]);

  const submit = async (values: ReconcileFormValues, overwrite: boolean) => {
    try {
      await reconcileMutation.mutateAsync({
        employeeId: values.employeeId,
        from: values.range[0].format('YYYY-MM-DD'),
        to: values.range[1].format('YYYY-MM-DD'),
        overwrite,
      });
      onClose();
    } catch (err) {
      const presentation = describeApiError(err);
      if (presentation.kind === 'conflict' && !overwrite) {
        confirmOverwrite(presentation, () => void submit(values, true));
      } else {
        setError(presentation);
      }
    }
  };

  const handleFinish = (values: ReconcileFormValues) => submit(values, false);

  return (
    <Drawer
      title="Rekonsiliasi Absensi"
      open={open}
      onClose={onClose}
      destroyOnHidden
      extra={
        <Space>
          <Button onClick={onClose}>Batal</Button>
          <Button
            type="primary"
            loading={reconcileMutation.isPending}
            onClick={() => form.submit()}
          >
            Jalankan
          </Button>
        </Space>
      }
    >
      {error && (
        <Alert
          style={{ marginBottom: 16 }}
          type="error"
          showIcon
          closable
          onClose={() => setError(null)}
          message={error.title}
          description={error.detail}
        />
      )}
      <Form<ReconcileFormValues> form={form} layout="vertical" onFinish={handleFinish}>
        <Form.Item
          name="employeeId"
          label="Karyawan"
          rules={[{ required: true, message: 'Karyawan wajib dipilih' }]}
        >
          <EmployeeSelect />
        </Form.Item>
        <Form.Item
          name="range"
          label="Rentang Tanggal"
          rules={[{ required: true, message: 'Rentang tanggal wajib diisi' }]}
        >
          <RangePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
        </Form.Item>
      </Form>
    </Drawer>
  );
}
