import { useState } from 'react';
import { Button, Form } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { EffectiveDatedMasterPage } from '../../../components/EffectiveDatedMasterPage';
import { FormDrawer } from '../../../components/FormDrawer';
import { formatIDR } from '../../../components/format';
import { StatusTag } from '../../../components/StatusTag';
import { PTKP_STATUS_LABELS } from '../../employees/labels';
import { PtkpMasterFormFields } from './PtkpMasterFormFields';
import { PtkpEffectivePreview } from './PtkpEffectivePreview';
import { useCreatePtkpMasterMutation, usePtkpMastersQuery, useUpdatePtkpMasterMutation } from './hooks';
import {
  ptkpMasterToRuntimeFormValues,
  runtimeFormValuesToApi,
  type PtkpMasterFormRuntimeValues,
} from './formValues';
import type { PtkpMaster } from './api';

// FE-T24 (09_FRONTEND_STEPS.md), §15.14 (08_FRONTEND_STRUCTURE.md). No
// delete anywhere — no such endpoint (§11); "Akhiri Masa Berlaku" opens
// this same edit form. R-07: every amount shown is exactly what the API
// returned, nothing computed.
export function PtkpMasterPage() {
  const query = usePtkpMastersQuery();
  const [form] = Form.useForm<PtkpMasterFormRuntimeValues>();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<PtkpMaster | null>(null);

  const createMutation = useCreatePtkpMasterMutation();
  const updateMutation = useUpdatePtkpMasterMutation(editing?.id ?? '');

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setDrawerOpen(true);
  };

  const openEdit = (record: PtkpMaster) => {
    setEditing(record);
    form.setFieldsValue(ptkpMasterToRuntimeFormValues(record));
    setDrawerOpen(true);
  };

  const handleFinish = async (values: PtkpMasterFormRuntimeValues) => {
    const payload = runtimeFormValuesToApi(values);
    if (editing) {
      await updateMutation.mutateAsync(payload);
    } else {
      await createMutation.mutateAsync(payload);
    }
  };

  const columns: ColumnsType<PtkpMaster> = [
    {
      title: 'Status PTKP',
      key: 'ptkpStatus',
      render: (_, record) => <StatusTag value={record.ptkpStatus} labels={PTKP_STATUS_LABELS} />,
    },
    {
      title: 'Nominal Tahunan',
      dataIndex: 'amount',
      key: 'amount',
      render: (value: string) => formatIDR(Number(value)),
    },
  ];

  return (
    <>
      <EffectiveDatedMasterPage<PtkpMaster>
        title="Master PTKP"
        query={query}
        columns={columns}
        primaryAction={
          <Button type="primary" onClick={openCreate}>
            Tambah Nominal PTKP
          </Button>
        }
        onRetire={openEdit}
        resolvePreview={<PtkpEffectivePreview />}
      />
      <FormDrawer<PtkpMasterFormRuntimeValues>
        open={drawerOpen}
        title={editing ? 'Ubah Nominal PTKP' : 'Tambah Nominal PTKP'}
        onClose={() => setDrawerOpen(false)}
        onFinish={handleFinish}
        form={form}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
      >
        <PtkpMasterFormFields />
      </FormDrawer>
    </>
  );
}
