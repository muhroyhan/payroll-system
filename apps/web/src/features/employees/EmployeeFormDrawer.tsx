import { useEffect } from 'react';
import { Form, Spin } from 'antd';
import { FormDrawer } from '../../components/FormDrawer';
import { useOrgMasterListQuery } from '../organization/hooks';
import { EmployeeFormFields } from './EmployeeFormFields';
import { useCreateEmployeeMutation, useUpdateEmployeeMutation } from './hooks';
import { employeeToRuntimeFormValues, runtimeFormValuesToApi, type EmployeeFormRuntimeValues } from './formValues';
import type { Employee } from './api';

interface EmployeeFormDrawerProps {
  open: boolean;
  onClose: () => void;
  /** Undefined = create mode. */
  employee?: Employee;
}

// FE-T06 (09_FRONTEND_STEPS.md) — shared by EmployeeListPage ("Tambah
// Karyawan") and EmployeeDetailPage ("Ubah"), so create/edit is one drawer,
// not two forms. No delete affordance exists anywhere near this component —
// /employees has no DELETE endpoint; deactivating is the `status` field
// inside this same form (§15.4).
export function EmployeeFormDrawer({ open, onClose, employee }: EmployeeFormDrawerProps) {
  const [form] = Form.useForm<EmployeeFormRuntimeValues>();

  const employeeTypesQuery = useOrgMasterListQuery('employeeTypes');
  const positionsQuery = useOrgMasterListQuery('positions');
  const departmentsQuery = useOrgMasterListQuery('departments');
  const divisionsQuery = useOrgMasterListQuery('divisions');

  const createMutation = useCreateEmployeeMutation();
  const updateMutation = useUpdateEmployeeMutation(employee?.id ?? '');

  useEffect(() => {
    if (!open) return;
    if (employee) {
      form.setFieldsValue(employeeToRuntimeFormValues(employee));
    } else {
      form.resetFields();
    }
  }, [open, employee, form]);

  const handleFinish = async (values: EmployeeFormRuntimeValues) => {
    const payload = runtimeFormValuesToApi(values);
    if (employee) {
      await updateMutation.mutateAsync(payload);
    } else {
      await createMutation.mutateAsync(payload);
    }
  };

  const orgOptionsReady =
    employeeTypesQuery.data && positionsQuery.data && departmentsQuery.data && divisionsQuery.data;

  return (
    <FormDrawer<EmployeeFormRuntimeValues>
      open={open}
      title={employee ? `Ubah Karyawan — ${employee.name}` : 'Tambah Karyawan'}
      onClose={onClose}
      onFinish={handleFinish}
      form={form}
      width={760}
      confirmLoading={createMutation.isPending || updateMutation.isPending}
    >
      {orgOptionsReady ? (
        <EmployeeFormFields
          form={form}
          orgOptions={{
            employeeTypes: employeeTypesQuery.data,
            positions: positionsQuery.data,
            departments: departmentsQuery.data,
            divisions: divisionsQuery.data,
          }}
          currentPtkpStatus={employee?.ptkpStatus}
        />
      ) : (
        <Spin />
      )}
    </FormDrawer>
  );
}
