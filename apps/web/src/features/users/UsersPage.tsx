import { useEffect, useState } from 'react';
import { Button, Form, Input, Popconfirm, Select, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ListPage } from '../../components/ListPage';
import { FormDrawer } from '../../components/FormDrawer';
import { StatusTag } from '../../components/StatusTag';
import { enumSelectOptions } from '../../components/enumSelectOptions';
import {
  useCreateUserMutation,
  useDeactivateUserMutation,
  useReactivateUserMutation,
  useUsersQuery,
} from './hooks';
import { ROLE_LABELS } from './labels';
import type { AppUser, CreateUserFormValues } from './api';

// FE-T25 (09_FRONTEND_STEPS.md), §15.14 (08_FRONTEND_STRUCTURE.md).
// Admin-only. List + create + deactivate/reactivate (USER-005) — there is
// still no generic edit on /users (see api.ts's note).
export function UsersPage() {
  const query = useUsersQuery();
  const createMutation = useCreateUserMutation();
  const deactivateMutation = useDeactivateUserMutation();
  const reactivateMutation = useReactivateUserMutation();
  const [form] = Form.useForm<CreateUserFormValues>();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (drawerOpen) form.resetFields();
  }, [drawerOpen, form]);

  const handleFinish = async (values: CreateUserFormValues) => {
    await createMutation.mutateAsync(values);
  };

  const columns: ColumnsType<AppUser> = [
    { title: 'Nama', dataIndex: 'name', key: 'name' },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    {
      title: 'Peran',
      key: 'role',
      render: (_, record) => <StatusTag value={record.role} labels={ROLE_LABELS} />,
    },
    {
      title: 'Status',
      key: 'isActive',
      render: (_, record) =>
        record.isActive ? <Tag color="green">Aktif</Tag> : <Tag>Nonaktif</Tag>,
    },
    {
      title: 'Aksi',
      key: 'actions',
      render: (_, record) =>
        record.isActive ? (
          <Popconfirm
            title={`Nonaktifkan ${record.name}?`}
            description="Pengguna ini tidak akan bisa login setelah dinonaktifkan."
            onConfirm={() => deactivateMutation.mutate(record.id)}
          >
            <Typography.Link>Nonaktifkan</Typography.Link>
          </Popconfirm>
        ) : (
          <Popconfirm
            title={`Aktifkan kembali ${record.name}?`}
            onConfirm={() => reactivateMutation.mutate(record.id)}
          >
            <Typography.Link>Aktifkan Kembali</Typography.Link>
          </Popconfirm>
        ),
    },
  ];

  return (
    <>
      <ListPage<AppUser>
        title="Pengguna"
        primaryAction={
          <Button type="primary" onClick={() => setDrawerOpen(true)}>
            Tambah Pengguna
          </Button>
        }
        query={query}
        columns={columns}
        rowKey="id"
        emptyDescription="Belum ada pengguna."
      />
      <FormDrawer<CreateUserFormValues>
        open={drawerOpen}
        title="Tambah Pengguna"
        onClose={() => setDrawerOpen(false)}
        onFinish={handleFinish}
        form={form}
        confirmLoading={createMutation.isPending}
      >
        <Form.Item
          name="name"
          label="Nama"
          rules={[{ required: true, message: 'Nama wajib diisi' }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          name="email"
          label="Email"
          rules={[
            { required: true, message: 'Email wajib diisi' },
            { type: 'email', message: 'Format email tidak valid' },
          ]}
        >
          <Input autoComplete="off" />
        </Form.Item>
        <Form.Item
          name="password"
          label="Kata Sandi"
          rules={[
            { required: true, message: 'Kata sandi wajib diisi' },
            { min: 8, message: 'Kata sandi minimal 8 karakter' },
          ]}
        >
          <Input.Password autoComplete="new-password" />
        </Form.Item>
        <Form.Item
          name="role"
          label="Peran"
          rules={[{ required: true, message: 'Peran wajib dipilih' }]}
        >
          <Select options={enumSelectOptions(ROLE_LABELS)} />
        </Form.Item>
      </FormDrawer>
    </>
  );
}
