import { useState } from 'react';
import { Button, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ListPage } from '../../components/ListPage';
import { StatusTag } from '../../components/StatusTag';
import { usePayslipComponentsQuery } from './hooks';
import { PayslipComponentFormDrawer } from './PayslipComponentFormDrawer';
import { PAYSLIP_COMPONENT_TYPE_LABELS } from './labels';
import type { PayslipComponent } from './api';

// FE-T22 (09_FRONTEND_STEPS.md), §15.6 (08_FRONTEND_STRUCTURE.md).
// Admin-only. Plain CRUD, no ScopeSelector/EffectiveDatedMasterPage — this
// master has neither scope nor effective-date fields (see api.ts). No
// delete action — §11, no such endpoint exists.
export function PayslipComponentsPage() {
  const query = usePayslipComponentsQuery();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<PayslipComponent | null>(null);

  const openCreate = () => {
    setEditing(null);
    setDrawerOpen(true);
  };

  const openEdit = (record: PayslipComponent) => {
    setEditing(record);
    setDrawerOpen(true);
  };

  const columns: ColumnsType<PayslipComponent> = [
    { title: 'Nama', dataIndex: 'name', key: 'name' },
    {
      title: 'Tipe',
      key: 'componentType',
      render: (_, record) => (
        <StatusTag value={record.componentType} labels={PAYSLIP_COMPONENT_TYPE_LABELS} />
      ),
    },
    {
      title: 'Kena Pajak',
      key: 'isTaxable',
      render: (_, record) => (record.isTaxable ? <Tag color="blue">Ya</Tag> : <Tag>Tidak</Tag>),
    },
    {
      title: 'Basis BPJS',
      key: 'isBpjsEligible',
      render: (_, record) => (record.isBpjsEligible ? <Tag color="blue">Ya</Tag> : <Tag>Tidak</Tag>),
    },
    {
      title: 'Aksi',
      key: 'actions',
      render: (_, record) => (
        <Typography.Link onClick={() => openEdit(record)}>Ubah</Typography.Link>
      ),
    },
  ];

  return (
    <>
      <ListPage<PayslipComponent>
        title="Komponen Payslip"
        primaryAction={
          <Button type="primary" onClick={openCreate}>
            Tambah Komponen
          </Button>
        }
        query={query}
        columns={columns}
        rowKey="id"
        emptyDescription="Belum ada komponen payslip."
      />
      <PayslipComponentFormDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        component={editing ?? undefined}
      />
    </>
  );
}
