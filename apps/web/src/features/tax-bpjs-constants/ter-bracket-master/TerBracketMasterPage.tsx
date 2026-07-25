import { useState } from 'react';
import { Button, Form } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { EffectiveDatedMasterPage } from '../../../components/EffectiveDatedMasterPage';
import { FormDrawer } from '../../../components/FormDrawer';
import { formatIDR } from '../../../components/format';
import { StatusTag } from '../../../components/StatusTag';
import { TerBracketMasterFormFields } from './TerBracketMasterFormFields';
import { TerBracketEffectivePreview } from './TerBracketEffectivePreview';
import { TER_CATEGORY_LABELS } from './labels';
import {
  useCreateTerBracketMasterMutation,
  useTerBracketMastersQuery,
  useUpdateTerBracketMasterMutation,
} from './hooks';
import {
  runtimeFormValuesToApi,
  terBracketMasterToRuntimeFormValues,
  type TerBracketMasterFormRuntimeValues,
} from './formValues';
import type { TerBracketMaster } from './api';

// FE-T24 (09_FRONTEND_STEPS.md), §15.14. No delete anywhere (§11).
export function TerBracketMasterPage() {
  const query = useTerBracketMastersQuery();
  const [form] = Form.useForm<TerBracketMasterFormRuntimeValues>();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<TerBracketMaster | null>(null);

  const createMutation = useCreateTerBracketMasterMutation();
  const updateMutation = useUpdateTerBracketMasterMutation(editing?.id ?? '');

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setDrawerOpen(true);
  };

  const openEdit = (record: TerBracketMaster) => {
    setEditing(record);
    form.setFieldsValue(terBracketMasterToRuntimeFormValues(record));
    setDrawerOpen(true);
  };

  const handleFinish = async (values: TerBracketMasterFormRuntimeValues) => {
    const payload = runtimeFormValuesToApi(values);
    if (editing) {
      await updateMutation.mutateAsync(payload);
    } else {
      await createMutation.mutateAsync(payload);
    }
  };

  const columns: ColumnsType<TerBracketMaster> = [
    {
      title: 'Kategori',
      key: 'terCategory',
      render: (_, record) => <StatusTag value={record.terCategory} labels={TER_CATEGORY_LABELS} />,
    },
    {
      title: 'Batas Bawah',
      dataIndex: 'incomeLowerBound',
      key: 'incomeLowerBound',
      render: (value: string) => formatIDR(Number(value)),
    },
    {
      title: 'Batas Atas',
      dataIndex: 'incomeUpperBound',
      key: 'incomeUpperBound',
      render: (value: string | null) => (value ? formatIDR(Number(value)) : 'Tidak terbatas'),
    },
    { title: 'Tarif (fraksi)', dataIndex: 'rate', key: 'rate' },
  ];

  return (
    <>
      <EffectiveDatedMasterPage<TerBracketMaster>
        title="Bracket TER"
        query={query}
        columns={columns}
        primaryAction={
          <Button type="primary" onClick={openCreate}>
            Tambah Bracket TER
          </Button>
        }
        onRetire={openEdit}
        resolvePreview={<TerBracketEffectivePreview />}
      />
      <FormDrawer<TerBracketMasterFormRuntimeValues>
        open={drawerOpen}
        title={editing ? 'Ubah Bracket TER' : 'Tambah Bracket TER'}
        onClose={() => setDrawerOpen(false)}
        onFinish={handleFinish}
        form={form}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
      >
        <TerBracketMasterFormFields />
      </FormDrawer>
    </>
  );
}
