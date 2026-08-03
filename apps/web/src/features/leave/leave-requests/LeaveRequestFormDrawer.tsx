import { useEffect } from 'react';
import { DatePicker, Form, Select } from 'antd';
import { FormDrawer } from '../../../components/FormDrawer';
import { EmployeeSelect } from '../../employees/EmployeeSelect';
import { useLeaveTypesQuery } from '../leave-types/hooks';
import { useCreateLeaveRequestMutation, useUpdateLeaveRequestMutation } from './hooks';
import {
  leaveRequestToRuntimeFormValues,
  runtimeFormValuesToApi,
  type LeaveRequestFormRuntimeValues,
} from './formValues';
import type { LeaveRequest } from './api';

interface LeaveRequestFormDrawerProps {
  open: boolean;
  onClose: () => void;
  /** Undefined = create mode. Only reachable while status = pending — the
   *  trigger buttons (list/detail) already hide/disable this for anything
   *  else (R-06a), so this component doesn't need to re-check status. */
  request?: LeaveRequest;
}

// FE-T14 (09_FRONTEND_STEPS.md), §15.9 (08_FRONTEND_STRUCTURE.md).
export function LeaveRequestFormDrawer({ open, onClose, request }: LeaveRequestFormDrawerProps) {
  const [form] = Form.useForm<LeaveRequestFormRuntimeValues>();
  const leaveTypesQuery = useLeaveTypesQuery();

  const createMutation = useCreateLeaveRequestMutation();
  const updateMutation = useUpdateLeaveRequestMutation(request?.id ?? '');

  useEffect(() => {
    if (!open) return;
    if (request) {
      form.setFieldsValue(leaveRequestToRuntimeFormValues(request));
    } else {
      form.resetFields();
    }
  }, [open, request, form]);

  const handleFinish = async (values: LeaveRequestFormRuntimeValues) => {
    const payload = runtimeFormValuesToApi(values);
    if (request) {
      await updateMutation.mutateAsync(payload);
    } else {
      await createMutation.mutateAsync(payload);
    }
  };

  return (
    <FormDrawer<LeaveRequestFormRuntimeValues>
      open={open}
      title={request ? 'Ubah Pengajuan Cuti' : 'Ajukan Cuti'}
      onClose={onClose}
      onFinish={handleFinish}
      form={form}
      confirmLoading={createMutation.isPending || updateMutation.isPending}
    >
      <Form.Item
        name="employeeId"
        label="Karyawan"
        rules={[{ required: true, message: 'Karyawan wajib dipilih' }]}
      >
        <EmployeeSelect />
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
        name="startDate"
        label="Tanggal Mulai"
        rules={[{ required: true, message: 'Tanggal mulai wajib diisi' }]}
      >
        <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
      </Form.Item>
      <Form.Item
        name="endDate"
        label="Tanggal Selesai"
        rules={[{ required: true, message: 'Tanggal selesai wajib diisi' }]}
      >
        <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
      </Form.Item>
    </FormDrawer>
  );
}
