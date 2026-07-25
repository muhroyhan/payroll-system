import { useState } from 'react';
import { Alert, Button, Form, Input, Popconfirm, Space, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ListPage } from '../../../components/ListPage';
import { FormDrawer } from '../../../components/FormDrawer';
import { describeApiError } from '../../../api/errors';
import {
  useCreateLeaveTypeMutation,
  useLeaveTypesQuery,
  useRemoveLeaveTypeMutation,
  useUpdateLeaveTypeMutation,
} from './hooks';
import type { LeaveType, LeaveTypeFormValues } from './api';

// FE-T12 (09_FRONTEND_STEPS.md), §15.9 (08_FRONTEND_STRUCTURE.md) — plain
// CRUD, same shape as organization's masters, NOT effective-dated (unlike
// leave-policy-master, LeavePolicyMasterPage.tsx).
export function LeaveTypesPage() {
  const query = useLeaveTypesQuery();
  const createMutation = useCreateLeaveTypeMutation();
  const updateMutation = useUpdateLeaveTypeMutation();
  const removeMutation = useRemoveLeaveTypeMutation();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<LeaveType | null>(null);
  const [form] = Form.useForm<LeaveTypeFormValues>();
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setDrawerOpen(true);
  };

  const openEdit = (record: LeaveType) => {
    setEditing(record);
    form.setFieldsValue({ name: record.name });
    setDrawerOpen(true);
  };

  const handleFinish = async (values: LeaveTypeFormValues) => {
    if (editing) {
      await updateMutation.mutateAsync({ id: editing.id, input: values });
    } else {
      await createMutation.mutateAsync(values);
    }
  };

  const handleDelete = async (record: LeaveType) => {
    setDeleteError(null);
    try {
      await removeMutation.mutateAsync(record.id);
    } catch (err) {
      setDeleteError(describeApiError(err).title);
    }
  };

  const columns: ColumnsType<LeaveType> = [
    { title: 'Nama', dataIndex: 'name', key: 'name' },
    {
      title: 'Aksi',
      key: 'actions',
      width: 160,
      render: (_, record) => (
        <Space>
          <Typography.Link onClick={() => openEdit(record)}>Ubah</Typography.Link>
          <Popconfirm title="Hapus jenis cuti ini?" onConfirm={() => handleDelete(record)}>
            <Typography.Link>Hapus</Typography.Link>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      {deleteError && (
        <Alert
          type="error"
          showIcon
          closable
          style={{ marginBottom: 16 }}
          message={deleteError}
          onClose={() => setDeleteError(null)}
        />
      )}
      <ListPage<LeaveType>
        title="Jenis Cuti"
        primaryAction={
          <Button type="primary" onClick={openCreate}>
            Tambah Jenis Cuti
          </Button>
        }
        query={query}
        columns={columns}
        rowKey="id"
      />
      <FormDrawer<LeaveTypeFormValues>
        open={drawerOpen}
        title={editing ? 'Ubah Jenis Cuti' : 'Tambah Jenis Cuti'}
        onClose={() => setDrawerOpen(false)}
        onFinish={handleFinish}
        form={form}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
      >
        <Form.Item
          name="name"
          label="Nama"
          rules={[{ required: true, message: 'Nama wajib diisi' }]}
        >
          <Input />
        </Form.Item>
      </FormDrawer>
    </div>
  );
}
