import { useState } from 'react';
import { Button, Drawer, Form } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { AuditEntityType } from '@payroll-system/shared-types';
import { EffectiveDatedMasterPage } from '../../components/EffectiveDatedMasterPage';
import { FormDrawer } from '../../components/FormDrawer';
import { formatIDR } from '../../components/format';
import { AuditHistoryPanel } from '../audit-events/AuditHistoryPanel';
import { useScopeReferenceData } from '../scope-resolver/useScopeReferenceData';
import { SCOPE_TYPE_LABELS } from '../scope-resolver/labels';
import { SalaryMasterFormFields } from './SalaryMasterFormFields';
import { SalaryResolvePreview } from './SalaryResolvePreview';
import { useCreateSalaryMasterMutation, useSalaryMastersQuery, useUpdateSalaryMasterMutation } from './hooks';
import {
  runtimeFormValuesToApi,
  salaryMasterToRuntimeFormValues,
  type SalaryMasterFormRuntimeValues,
} from './formValues';
import type { SalaryMaster } from './api';

// FE-T09 (09_FRONTEND_STEPS.md), §15.5 (08_FRONTEND_STRUCTURE.md). No delete
// action anywhere — /salary-master has no DELETE endpoint (§11);
// EffectiveDatedMasterPage's "Akhiri Masa Berlaku" opens this same edit
// form, which is where effectiveEndDate gets set.
export function SalaryMasterPage() {
  const query = useSalaryMastersQuery();
  const { labelFor } = useScopeReferenceData();

  const [form] = Form.useForm<SalaryMasterFormRuntimeValues>();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<SalaryMaster | null>(null);
  const [historyRecord, setHistoryRecord] = useState<SalaryMaster | null>(null);

  const createMutation = useCreateSalaryMasterMutation();
  const updateMutation = useUpdateSalaryMasterMutation(editing?.id ?? '');

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setDrawerOpen(true);
  };

  const openEdit = (record: SalaryMaster) => {
    setEditing(record);
    form.setFieldsValue(salaryMasterToRuntimeFormValues(record));
    setDrawerOpen(true);
  };

  const handleFinish = async (values: SalaryMasterFormRuntimeValues) => {
    const payload = runtimeFormValuesToApi(values);
    if (editing) {
      await updateMutation.mutateAsync(payload);
    } else {
      await createMutation.mutateAsync(payload);
    }
  };

  const columns: ColumnsType<SalaryMaster> = [
    {
      title: 'Cakupan',
      key: 'scope',
      render: (_, record) =>
        `${SCOPE_TYPE_LABELS[record.scopeType]} — ${labelFor(record.scopeType, record.scopeValue)}`,
    },
    {
      title: 'Gaji Pokok',
      dataIndex: 'baseSalary',
      key: 'baseSalary',
      render: (value: string) => formatIDR(Number(value)),
    },
  ];

  return (
    <>
      <EffectiveDatedMasterPage<SalaryMaster>
        title="Master Gaji Karyawan"
        query={query}
        columns={columns}
        primaryAction={
          <Button type="primary" onClick={openCreate}>
            Tambah Aturan Gaji
          </Button>
        }
        onRetire={openEdit}
        onShowHistory={setHistoryRecord}
        resolvePreview={<SalaryResolvePreview />}
      />
      <FormDrawer<SalaryMasterFormRuntimeValues>
        open={drawerOpen}
        title={editing ? 'Ubah Aturan Gaji' : 'Tambah Aturan Gaji'}
        onClose={() => setDrawerOpen(false)}
        onFinish={handleFinish}
        form={form}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
      >
        <SalaryMasterFormFields form={form} />
      </FormDrawer>
      <Drawer
        title="Histori Perubahan"
        open={!!historyRecord}
        onClose={() => setHistoryRecord(null)}
        width={640}
      >
        {historyRecord && (
          <AuditHistoryPanel
            entityType={AuditEntityType.SALARY_MASTER}
            entityId={historyRecord.id}
          />
        )}
      </Drawer>
    </>
  );
}
