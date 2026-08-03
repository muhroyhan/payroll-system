import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  DatePicker,
  Drawer,
  Form,
  InputNumber,
  Space,
  Switch,
  TimePicker,
} from 'antd';
import type { Dayjs } from 'dayjs';
import { EmployeeSelect } from '../../employees/EmployeeSelect';
import { useCreateAttendanceRecordMutation } from './hooks';
import { confirmOverwrite } from './confirmOverwrite';
import {
  describeApiError,
  toAntdFormFields,
  type ApiErrorPresentation,
} from '../../../api/errors';
import type { AttendanceRecordFormValues } from './api';

interface AttendanceManualEntryFormValues {
  employeeId: string;
  date: Dayjs;
  clockIn?: Dayjs;
  clockOut?: Dayjs;
  overtimeHours?: number;
  isHoliday?: boolean;
  isOnLeave?: boolean;
  hasPermission?: boolean;
}

interface AttendanceManualEntryDrawerProps {
  open: boolean;
  onClose: () => void;
}

function combineDateAndTime(date: Dayjs, time: Dayjs | undefined): string | undefined {
  if (!time) return undefined;
  return date.hour(time.hour()).minute(time.minute()).second(0).toISOString();
}

// FE-T17 (09_FRONTEND_STEPS.md), §15.8 C (08_FRONTEND_STRUCTURE.md). Does
// NOT use the shared FormDrawer archetype (components/FormDrawer.tsx) —
// this is the one write path in the app where a 409 means "ask whether to
// overwrite, then resubmit," not "show and dismiss." FormDrawer's generic
// conflict handling only dismisses; it doesn't retry, so this needed its
// own submit flow built directly on Drawer + Form.
export function AttendanceManualEntryDrawer({ open, onClose }: AttendanceManualEntryDrawerProps) {
  const [form] = Form.useForm<AttendanceManualEntryFormValues>();
  const createMutation = useCreateAttendanceRecordMutation();
  const [error, setError] = useState<ApiErrorPresentation | null>(null);

  useEffect(() => {
    if (open) {
      form.resetFields();
      setError(null);
    }
  }, [open, form]);

  const submit = async (values: AttendanceManualEntryFormValues, overwrite: boolean) => {
    const payload: AttendanceRecordFormValues = {
      employeeId: values.employeeId,
      date: values.date.format('YYYY-MM-DD'),
      clockIn: combineDateAndTime(values.date, values.clockIn),
      clockOut: combineDateAndTime(values.date, values.clockOut),
      overtimeHours: values.overtimeHours,
      isHoliday: values.isHoliday,
      isOnLeave: values.isOnLeave,
      hasPermission: values.hasPermission,
    };

    try {
      await createMutation.mutateAsync({ input: payload, overwrite });
      onClose();
    } catch (err) {
      const presentation = describeApiError(err);
      if (presentation.kind === 'validation') {
        form.setFields(
          toAntdFormFields(presentation.fieldErrors) as Parameters<typeof form.setFields>[0],
        );
        setError(presentation);
      } else if (presentation.kind === 'conflict' && !overwrite) {
        // §11/TC-ATT-07 — a different source already wrote this day; ask
        // before replacing it (confirmOverwrite.ts), never silently retry.
        confirmOverwrite(presentation, () => void submit(values, true));
      } else {
        setError(presentation);
      }
    }
  };

  const handleFinish = (values: AttendanceManualEntryFormValues) => submit(values, false);

  return (
    <Drawer
      title="Tambah Absensi Manual"
      open={open}
      onClose={onClose}
      destroyOnHidden
      extra={
        <Space>
          <Button onClick={onClose}>Batal</Button>
          <Button type="primary" loading={createMutation.isPending} onClick={() => form.submit()}>
            Simpan
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
      <Form<AttendanceManualEntryFormValues> form={form} layout="vertical" onFinish={handleFinish}>
        <Form.Item
          name="employeeId"
          label="Karyawan"
          rules={[{ required: true, message: 'Karyawan wajib dipilih' }]}
        >
          <EmployeeSelect />
        </Form.Item>
        <Form.Item
          name="date"
          label="Tanggal"
          rules={[{ required: true, message: 'Tanggal wajib diisi' }]}
        >
          <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
        </Form.Item>
        <Form.Item name="clockIn" label="Jam Masuk">
          <TimePicker style={{ width: '100%' }} format="HH:mm" />
        </Form.Item>
        <Form.Item name="clockOut" label="Jam Keluar">
          <TimePicker style={{ width: '100%' }} format="HH:mm" />
        </Form.Item>
        <Form.Item name="overtimeHours" label="Jam Lembur">
          <InputNumber style={{ width: '100%' }} min={0} step={0.5} />
        </Form.Item>
        <Form.Item name="isHoliday" label="Hari Libur" valuePropName="checked">
          <Switch />
        </Form.Item>
        <Form.Item name="isOnLeave" label="Sedang Cuti" valuePropName="checked">
          <Switch />
        </Form.Item>
        <Form.Item name="hasPermission" label="Ada Izin" valuePropName="checked">
          <Switch />
        </Form.Item>
      </Form>
    </Drawer>
  );
}
