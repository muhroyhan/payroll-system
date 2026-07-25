import { useState } from 'react';
import { Button, Form, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { EffectiveDatedMasterPage } from '../../components/EffectiveDatedMasterPage';
import { FormDrawer } from '../../components/FormDrawer';
import { formatIDR } from '../../components/format';
import { useScopeReferenceData } from '../scope-resolver/useScopeReferenceData';
import { SCOPE_TYPE_LABELS } from '../scope-resolver/labels';
import { IncentiveMasterFormFields } from './IncentiveMasterFormFields';
import { IncentiveResolvePreview } from './IncentiveResolvePreview';
import {
  useCreateIncentiveMasterMutation,
  useIncentiveMastersQuery,
  useUpdateIncentiveMasterMutation,
} from './hooks';
import {
  incentiveMasterToRuntimeFormValues,
  runtimeFormValuesToApi,
  type IncentiveMasterFormRuntimeValues,
} from './formValues';
import type { IncentiveMaster } from './api';

// FE-T10 (09_FRONTEND_STEPS.md), §15.5. Same archetype as SalaryMasterPage
// (FE-T09) — confirms ScopeSelector/EffectiveDatedMasterPage generalized
// correctly; the only new code is the money-field name and isBpjsEligible.
export function IncentiveMasterPage() {
  const query = useIncentiveMastersQuery();
  const { labelFor } = useScopeReferenceData();

  const [form] = Form.useForm<IncentiveMasterFormRuntimeValues>();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<IncentiveMaster | null>(null);

  const createMutation = useCreateIncentiveMasterMutation();
  const updateMutation = useUpdateIncentiveMasterMutation(editing?.id ?? '');

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setDrawerOpen(true);
  };

  const openEdit = (record: IncentiveMaster) => {
    setEditing(record);
    form.setFieldsValue(incentiveMasterToRuntimeFormValues(record));
    setDrawerOpen(true);
  };

  const handleFinish = async (values: IncentiveMasterFormRuntimeValues) => {
    const payload = runtimeFormValuesToApi(values);
    if (editing) {
      await updateMutation.mutateAsync(payload);
    } else {
      await createMutation.mutateAsync(payload);
    }
  };

  const columns: ColumnsType<IncentiveMaster> = [
    {
      title: 'Cakupan',
      key: 'scope',
      render: (_, record) =>
        `${SCOPE_TYPE_LABELS[record.scopeType]} — ${labelFor(record.scopeType, record.scopeValue)}`,
    },
    {
      title: 'Nominal Insentif',
      dataIndex: 'incentiveAmount',
      key: 'incentiveAmount',
      render: (value: string) => formatIDR(Number(value)),
    },
    {
      title: 'Basis BPJS',
      dataIndex: 'isBpjsEligible',
      key: 'isBpjsEligible',
      render: (value: boolean) => (value ? <Tag color="blue">Ya</Tag> : <Tag>Tidak</Tag>),
    },
  ];

  return (
    <>
      <EffectiveDatedMasterPage<IncentiveMaster>
        title="Master Insentif"
        query={query}
        columns={columns}
        primaryAction={
          <Button type="primary" onClick={openCreate}>
            Tambah Aturan Insentif
          </Button>
        }
        onRetire={openEdit}
        resolvePreview={<IncentiveResolvePreview />}
      />
      <FormDrawer<IncentiveMasterFormRuntimeValues>
        open={drawerOpen}
        title={editing ? 'Ubah Aturan Insentif' : 'Tambah Aturan Insentif'}
        onClose={() => setDrawerOpen(false)}
        onFinish={handleFinish}
        form={form}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
      >
        <IncentiveMasterFormFields form={form} />
      </FormDrawer>
    </>
  );
}
