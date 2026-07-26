import { useState } from 'react';
import { Button, Drawer, Form } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { AuditEntityType } from '@payroll-system/shared-types';
import { EffectiveDatedMasterPage } from '../../../components/EffectiveDatedMasterPage';
import { FormDrawer } from '../../../components/FormDrawer';
import { AuditHistoryPanel } from '../../audit-events/AuditHistoryPanel';
import { useScopeReferenceData } from '../../scope-resolver/useScopeReferenceData';
import { SCOPE_TYPE_LABELS } from '../../scope-resolver/labels';
import { useLeaveTypesQuery } from '../leave-types/hooks';
import { LeavePolicyMasterFormFields } from './LeavePolicyMasterFormFields';
import { LeavePolicyResolvePreview } from './LeavePolicyResolvePreview';
import {
  useCreateLeavePolicyMasterMutation,
  useLeavePolicyMastersQuery,
  useUpdateLeavePolicyMasterMutation,
} from './hooks';
import {
  leavePolicyMasterToRuntimeFormValues,
  runtimeFormValuesToApi,
  type LeavePolicyMasterFormRuntimeValues,
} from './formValues';
import type { LeavePolicyMaster } from './api';

// FE-T12 (09_FRONTEND_STEPS.md), §15.9. No delete anywhere —
// /leave-policy-master has no DELETE endpoint (§11); "Akhiri Masa Berlaku"
// opens this same edit form.
export function LeavePolicyMasterPage() {
  const query = useLeavePolicyMastersQuery();
  const leaveTypesQuery = useLeaveTypesQuery();
  const { labelFor } = useScopeReferenceData();

  const [form] = Form.useForm<LeavePolicyMasterFormRuntimeValues>();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<LeavePolicyMaster | null>(null);
  const [historyRecord, setHistoryRecord] = useState<LeavePolicyMaster | null>(null);

  const createMutation = useCreateLeavePolicyMasterMutation();
  const updateMutation = useUpdateLeavePolicyMasterMutation(editing?.id ?? '');

  const leaveTypeName = (leaveTypeId: string) =>
    leaveTypesQuery.data?.find((type) => type.id === leaveTypeId)?.name ?? leaveTypeId;

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setDrawerOpen(true);
  };

  const openEdit = (record: LeavePolicyMaster) => {
    setEditing(record);
    form.setFieldsValue(leavePolicyMasterToRuntimeFormValues(record));
    setDrawerOpen(true);
  };

  const handleFinish = async (values: LeavePolicyMasterFormRuntimeValues) => {
    const payload = runtimeFormValuesToApi(values);
    if (editing) {
      await updateMutation.mutateAsync(payload);
    } else {
      await createMutation.mutateAsync(payload);
    }
  };

  const columns: ColumnsType<LeavePolicyMaster> = [
    { title: 'Jenis Cuti', key: 'leaveType', render: (_, record) => leaveTypeName(record.leaveTypeId) },
    {
      title: 'Cakupan',
      key: 'scope',
      render: (_, record) =>
        `${SCOPE_TYPE_LABELS[record.scopeType]} — ${labelFor(record.scopeType, record.scopeValue)}`,
    },
    {
      title: 'Kuota Tahunan',
      dataIndex: 'annualQuota',
      key: 'annualQuota',
      render: (value: number) => `${value} hari`,
    },
  ];

  return (
    <>
      <EffectiveDatedMasterPage<LeavePolicyMaster>
        title="Kebijakan Cuti"
        query={query}
        columns={columns}
        primaryAction={
          <Button type="primary" onClick={openCreate}>
            Tambah Kebijakan Cuti
          </Button>
        }
        onRetire={openEdit}
        onShowHistory={setHistoryRecord}
        resolvePreview={<LeavePolicyResolvePreview />}
      />
      <FormDrawer<LeavePolicyMasterFormRuntimeValues>
        open={drawerOpen}
        title={editing ? 'Ubah Kebijakan Cuti' : 'Tambah Kebijakan Cuti'}
        onClose={() => setDrawerOpen(false)}
        onFinish={handleFinish}
        form={form}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
      >
        <LeavePolicyMasterFormFields form={form} />
      </FormDrawer>
      <Drawer
        title="Histori Perubahan"
        open={!!historyRecord}
        onClose={() => setHistoryRecord(null)}
        width={640}
      >
        {historyRecord && (
          <AuditHistoryPanel
            entityType={AuditEntityType.LEAVE_POLICY_MASTER}
            entityId={historyRecord.id}
          />
        )}
      </Drawer>
    </>
  );
}
