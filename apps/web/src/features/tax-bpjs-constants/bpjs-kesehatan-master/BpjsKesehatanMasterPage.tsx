import { useState } from 'react';
import { Button, Drawer, Form } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { AuditEntityType } from '@payroll-system/shared-types';
import { EffectiveDatedMasterPage } from '../../../components/EffectiveDatedMasterPage';
import { FormDrawer } from '../../../components/FormDrawer';
import { formatIDR } from '../../../components/format';
import { AuditHistoryPanel } from '../../audit-events/AuditHistoryPanel';
import { BpjsKesehatanMasterFormFields } from './BpjsKesehatanMasterFormFields';
import { BpjsKesehatanEffectivePreview } from './BpjsKesehatanEffectivePreview';
import {
  useBpjsKesehatanMastersQuery,
  useCreateBpjsKesehatanMasterMutation,
  useUpdateBpjsKesehatanMasterMutation,
} from './hooks';
import {
  bpjsKesehatanMasterToRuntimeFormValues,
  runtimeFormValuesToApi,
  type BpjsKesehatanMasterFormRuntimeValues,
} from './formValues';
import type { BpjsKesehatanMaster } from './api';

// FE-T24 (09_FRONTEND_STEPS.md), §15.14. No delete anywhere (§11).
export function BpjsKesehatanMasterPage() {
  const query = useBpjsKesehatanMastersQuery();
  const [form] = Form.useForm<BpjsKesehatanMasterFormRuntimeValues>();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<BpjsKesehatanMaster | null>(null);
  const [historyRecord, setHistoryRecord] = useState<BpjsKesehatanMaster | null>(null);

  const createMutation = useCreateBpjsKesehatanMasterMutation();
  const updateMutation = useUpdateBpjsKesehatanMasterMutation(editing?.id ?? '');

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setDrawerOpen(true);
  };

  const openEdit = (record: BpjsKesehatanMaster) => {
    setEditing(record);
    form.setFieldsValue(bpjsKesehatanMasterToRuntimeFormValues(record));
    setDrawerOpen(true);
  };

  const handleFinish = async (values: BpjsKesehatanMasterFormRuntimeValues) => {
    const payload = runtimeFormValuesToApi(values);
    if (editing) {
      await updateMutation.mutateAsync(payload);
    } else {
      await createMutation.mutateAsync(payload);
    }
  };

  const columns: ColumnsType<BpjsKesehatanMaster> = [
    { title: 'Tarif Karyawan', dataIndex: 'employeeRate', key: 'employeeRate' },
    { title: 'Tarif Perusahaan', dataIndex: 'companyRate', key: 'companyRate' },
    {
      title: 'Batas Upah',
      dataIndex: 'wageCap',
      key: 'wageCap',
      render: (value: string) => formatIDR(Number(value)),
    },
  ];

  return (
    <>
      <EffectiveDatedMasterPage<BpjsKesehatanMaster>
        title="BPJS Kesehatan"
        query={query}
        columns={columns}
        primaryAction={
          <Button type="primary" onClick={openCreate}>
            Tambah Tarif BPJS Kesehatan
          </Button>
        }
        onRetire={openEdit}
        onShowHistory={setHistoryRecord}
        resolvePreview={<BpjsKesehatanEffectivePreview />}
      />
      <FormDrawer<BpjsKesehatanMasterFormRuntimeValues>
        open={drawerOpen}
        title={editing ? 'Ubah Tarif BPJS Kesehatan' : 'Tambah Tarif BPJS Kesehatan'}
        onClose={() => setDrawerOpen(false)}
        onFinish={handleFinish}
        form={form}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
      >
        <BpjsKesehatanMasterFormFields />
      </FormDrawer>
      <Drawer
        title="Histori Perubahan"
        open={!!historyRecord}
        onClose={() => setHistoryRecord(null)}
        width={640}
      >
        {historyRecord && (
          <AuditHistoryPanel
            entityType={AuditEntityType.BPJS_KESEHATAN_MASTER}
            entityId={historyRecord.id}
          />
        )}
      </Drawer>
    </>
  );
}
