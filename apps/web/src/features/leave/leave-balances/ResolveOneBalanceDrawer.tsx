import { useEffect } from 'react';
import { Form, InputNumber, Select } from 'antd';
import { FormDrawer } from '../../../components/FormDrawer';
import { useEmployeesQuery } from '../../employees/hooks';
import { useLeaveTypesQuery } from '../leave-types/hooks';
import { useResolveOneLeaveBalanceMutation } from './hooks';

interface ResolveOneBalanceFormValues {
  employeeId: string;
  leaveTypeId: string;
  year: number;
}

interface ResolveOneBalanceDrawerProps {
  open: boolean;
  onClose: () => void;
}

// FE-T13 (09_FRONTEND_STEPS.md), §15.9 — resolves ONE employee's balance
// from leave_policy_master (idempotent server-side: a balance that already
// exists is returned unchanged, never re-clobbered). A missing policy 404s
// (NotFoundException) — handled inline by FormDrawer/describeApiError, no
// special case needed here.
export function ResolveOneBalanceDrawer({ open, onClose }: ResolveOneBalanceDrawerProps) {
  const [form] = Form.useForm<ResolveOneBalanceFormValues>();
  const employeesQuery = useEmployeesQuery();
  const leaveTypesQuery = useLeaveTypesQuery();
  const resolveMutation = useResolveOneLeaveBalanceMutation();

  useEffect(() => {
    if (open) form.resetFields();
  }, [open, form]);

  const handleFinish = async (values: ResolveOneBalanceFormValues) => {
    await resolveMutation.mutateAsync(values);
  };

  return (
    <FormDrawer<ResolveOneBalanceFormValues>
      open={open}
      title="Resolve Saldo Cuti — Satu Karyawan"
      onClose={onClose}
      onFinish={handleFinish}
      form={form}
      confirmLoading={resolveMutation.isPending}
    >
      <Form.Item
        name="employeeId"
        label="Karyawan"
        rules={[{ required: true, message: 'Karyawan wajib dipilih' }]}
      >
        <Select
          showSearch
          optionFilterProp="label"
          options={(employeesQuery.data ?? []).map((employee) => ({
            value: employee.id,
            label: employee.name,
          }))}
        />
      </Form.Item>
      <Form.Item
        name="leaveTypeId"
        label="Jenis Cuti"
        rules={[{ required: true, message: 'Jenis cuti wajib dipilih' }]}
      >
        <Select
          options={(leaveTypesQuery.data ?? []).map((type) => ({
            value: type.id,
            label: type.name,
          }))}
        />
      </Form.Item>
      <Form.Item
        name="year"
        label="Tahun"
        rules={[{ required: true, message: 'Tahun wajib diisi' }]}
      >
        <InputNumber style={{ width: '100%' }} min={2000} max={2100} />
      </Form.Item>
    </FormDrawer>
  );
}
