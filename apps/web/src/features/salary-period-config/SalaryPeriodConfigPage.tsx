import { useEffect, useState } from 'react';
import { Alert, Button, Descriptions, Form, InputNumber, Spin, Typography } from 'antd';
import { useAuth } from '../auth/useAuth';
import { ApiErrorDisplay } from '../../components/ApiErrorDisplay';
import { describeApiError, type ApiErrorPresentation } from '../../api/errors';
import { useSalaryPeriodConfigQuery, useUpsertSalaryPeriodConfigMutation } from './hooks';
import type { SalaryPeriodConfigFormValues } from './api';

// FE-T25 (09_FRONTEND_STEPS.md), §15.14 (08_FRONTEND_STRUCTURE.md). Checked
// for a payroll-run linkage (this task explicitly asked to) — there is
// none (see api.ts's note), so no FE-T17/T23-style lock banner applies
// here. GET is readable by any authenticated user; only the write action
// is admin-only, reflected in-screen rather than by hiding the route.
export function SalaryPeriodConfigPage() {
  const { isAdmin } = useAuth();
  const query = useSalaryPeriodConfigQuery();
  const mutation = useUpsertSalaryPeriodConfigMutation();
  const [form] = Form.useForm<SalaryPeriodConfigFormValues>();
  const [error, setError] = useState<ApiErrorPresentation | null>(null);

  useEffect(() => {
    if (query.data) {
      form.setFieldsValue({
        attendanceCutoffDay: query.data.attendanceCutoffDay,
        payrollDisbursementDay: query.data.payrollDisbursementDay,
      });
    }
  }, [query.data, form]);

  const handleFinish = async (values: SalaryPeriodConfigFormValues) => {
    setError(null);
    try {
      await mutation.mutateAsync(values);
    } catch (err) {
      setError(describeApiError(err));
    }
  };

  // A 404 here means "not configured yet" — a real first-run state, not an
  // error toast.
  const notConfigured = query.isError;

  return (
    <div>
      <Typography.Title level={4}>Periode Gaji</Typography.Title>
      <ApiErrorDisplay error={error} onDismiss={() => setError(null)} />
      {query.isLoading && <Spin />}
      {notConfigured && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16, maxWidth: 400 }}
          message="Periode gaji belum dikonfigurasi"
          description={
            isAdmin ? 'Atur untuk pertama kali di bawah ini.' : 'Hubungi admin untuk mengatur ini.'
          }
        />
      )}
      {isAdmin && (query.data || notConfigured) && (
        <Form<SalaryPeriodConfigFormValues>
          form={form}
          layout="vertical"
          onFinish={handleFinish}
          style={{ maxWidth: 400 }}
        >
          <Form.Item
            name="attendanceCutoffDay"
            label="Tanggal Cutoff Absensi (tanggal dalam bulan)"
            rules={[{ required: true, message: 'Wajib diisi' }]}
          >
            <InputNumber style={{ width: '100%' }} min={1} max={31} />
          </Form.Item>
          <Form.Item
            name="payrollDisbursementDay"
            label="Tanggal Pencairan Gaji (tanggal dalam bulan)"
            rules={[{ required: true, message: 'Wajib diisi' }]}
          >
            <InputNumber style={{ width: '100%' }} min={1} max={31} />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={mutation.isPending}>
            Simpan
          </Button>
        </Form>
      )}
      {!isAdmin && query.data && (
        <Descriptions bordered column={1} size="small" style={{ maxWidth: 400 }}>
          <Descriptions.Item label="Tanggal Cutoff Absensi">
            {query.data.attendanceCutoffDay}
          </Descriptions.Item>
          <Descriptions.Item label="Tanggal Pencairan Gaji">
            {query.data.payrollDisbursementDay}
          </Descriptions.Item>
        </Descriptions>
      )}
    </div>
  );
}
