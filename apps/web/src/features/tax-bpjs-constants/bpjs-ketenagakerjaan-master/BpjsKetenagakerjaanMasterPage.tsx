import { useState } from 'react';
import { Button, Drawer, Form } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { AuditEntityType } from '@payroll-system/shared-types';
import { EffectiveDatedMasterPage } from '../../../components/EffectiveDatedMasterPage';
import { FormDrawer } from '../../../components/FormDrawer';
import { formatIDR } from '../../../components/format';
import { AuditHistoryPanel } from '../../audit-events/AuditHistoryPanel';
import { BpjsKetenagakerjaanMasterFormFields } from './BpjsKetenagakerjaanMasterFormFields';
import { BpjsKetenagakerjaanEffectivePreview } from './BpjsKetenagakerjaanEffectivePreview';
import {
  useBpjsKetenagakerjaanMastersQuery,
  useCreateBpjsKetenagakerjaanMasterMutation,
  useUpdateBpjsKetenagakerjaanMasterMutation,
} from './hooks';
import {
  bpjsKetenagakerjaanMasterToRuntimeFormValues,
  runtimeFormValuesToApi,
  type BpjsKetenagakerjaanMasterFormRuntimeValues,
} from './formValues';
import type { BpjsKetenagakerjaanMaster } from './api';

// FE-T24 (09_FRONTEND_STEPS.md), §15.14. No delete anywhere (§11).
export function BpjsKetenagakerjaanMasterPage() {
  const query = useBpjsKetenagakerjaanMastersQuery();
  const [form] = Form.useForm<BpjsKetenagakerjaanMasterFormRuntimeValues>();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<BpjsKetenagakerjaanMaster | null>(null);
  const [historyRecord, setHistoryRecord] = useState<BpjsKetenagakerjaanMaster | null>(
    null,
  );

  const createMutation = useCreateBpjsKetenagakerjaanMasterMutation();
  const updateMutation = useUpdateBpjsKetenagakerjaanMasterMutation(editing?.id ?? '');

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setDrawerOpen(true);
  };

  const openEdit = (record: BpjsKetenagakerjaanMaster) => {
    setEditing(record);
    form.setFieldsValue(bpjsKetenagakerjaanMasterToRuntimeFormValues(record));
    setDrawerOpen(true);
  };

  const handleFinish = async (values: BpjsKetenagakerjaanMasterFormRuntimeValues) => {
    const payload = runtimeFormValuesToApi(values);
    if (editing) {
      await updateMutation.mutateAsync(payload);
    } else {
      await createMutation.mutateAsync(payload);
    }
  };

  const columns: ColumnsType<BpjsKetenagakerjaanMaster> = [
    { title: 'JHT Karyawan', dataIndex: 'jhtEmployeeRate', key: 'jhtEmployeeRate' },
    { title: 'JHT Perusahaan', dataIndex: 'jhtCompanyRate', key: 'jhtCompanyRate' },
    { title: 'JP Karyawan', dataIndex: 'jpEmployeeRate', key: 'jpEmployeeRate' },
    { title: 'JP Perusahaan', dataIndex: 'jpCompanyRate', key: 'jpCompanyRate' },
    {
      title: 'JP Batas Upah',
      dataIndex: 'jpWageCap',
      key: 'jpWageCap',
      render: (value: string) => formatIDR(Number(value)),
    },
    { title: 'JKK Perusahaan', dataIndex: 'jkkCompanyRate', key: 'jkkCompanyRate' },
    { title: 'JKM Perusahaan', dataIndex: 'jkmCompanyRate', key: 'jkmCompanyRate' },
  ];

  return (
    <>
      <EffectiveDatedMasterPage<BpjsKetenagakerjaanMaster>
        title="BPJS Ketenagakerjaan"
        query={query}
        columns={columns}
        primaryAction={
          <Button type="primary" onClick={openCreate}>
            Tambah Tarif BPJS Ketenagakerjaan
          </Button>
        }
        onRetire={openEdit}
        onShowHistory={setHistoryRecord}
        resolvePreview={<BpjsKetenagakerjaanEffectivePreview />}
      />
      <FormDrawer<BpjsKetenagakerjaanMasterFormRuntimeValues>
        open={drawerOpen}
        title={editing ? 'Ubah Tarif BPJS Ketenagakerjaan' : 'Tambah Tarif BPJS Ketenagakerjaan'}
        onClose={() => setDrawerOpen(false)}
        onFinish={handleFinish}
        form={form}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
      >
        <BpjsKetenagakerjaanMasterFormFields />
      </FormDrawer>
      <Drawer
        title="Histori Perubahan"
        open={!!historyRecord}
        onClose={() => setHistoryRecord(null)}
        width={640}
      >
        {historyRecord && (
          <AuditHistoryPanel
            entityType={AuditEntityType.BPJS_KETENAGAKERJAAN_MASTER}
            entityId={historyRecord.id}
          />
        )}
      </Drawer>
    </>
  );
}
