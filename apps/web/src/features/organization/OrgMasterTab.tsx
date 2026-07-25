import { useState } from 'react';
import { Alert, Button, Form, Input, Popconfirm, Space, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ListPage } from '../../components/ListPage';
import { FormDrawer } from '../../components/FormDrawer';
import { describeApiError } from '../../api/errors';
import {
  useCreateOrgMasterMutation,
  useOrgMasterListQuery,
  useRemoveOrgMasterMutation,
  useUpdateOrgMasterMutation,
} from './hooks';
import type { OrgMasterInput, OrgMasterKey, OrgMasterRecord } from './api';

interface OrgMasterTabProps {
  masterKey: OrgMasterKey;
  label: string;
}

// FE-T08 (09_FRONTEND_STEPS.md) — one component drives all four organization
// tabs (§15.4), since divisions/departments/positions/employee-types share
// the exact same {id, name} CRUD shape (verified against the backend). Full
// CRUD — GET/POST/PUT/DELETE all exist and are A+H (§15.1).
export function OrgMasterTab({ masterKey, label }: OrgMasterTabProps) {
  const query = useOrgMasterListQuery(masterKey);
  const createMutation = useCreateOrgMasterMutation(masterKey);
  const updateMutation = useUpdateOrgMasterMutation(masterKey);
  const removeMutation = useRemoveOrgMasterMutation(masterKey);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<OrgMasterRecord | null>(null);
  const [form] = Form.useForm<OrgMasterInput>();
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setDrawerOpen(true);
  };

  const openEdit = (record: OrgMasterRecord) => {
    setEditing(record);
    form.setFieldsValue({ name: record.name });
    setDrawerOpen(true);
  };

  const handleFinish = async (values: OrgMasterInput) => {
    if (editing) {
      await updateMutation.mutateAsync({ id: editing.id, input: values });
    } else {
      await createMutation.mutateAsync(values);
    }
  };

  const handleDelete = async (record: OrgMasterRecord) => {
    setDeleteError(null);
    try {
      await removeMutation.mutateAsync(record.id);
    } catch (err) {
      // Deleting a row still assigned to an employee 409s (a plain FK
      // constraint, not a §11 lock — it isn't in the §15.2 lock matrix, so
      // there's nothing derivable to pre-emptively disable). The 409 is
      // still routed through describeApiError() per R-04, never rendered
      // raw.
      setDeleteError(describeApiError(err).title);
    }
  };

  const columns: ColumnsType<OrgMasterRecord> = [
    { title: 'Nama', dataIndex: 'name', key: 'name' },
    {
      title: 'Aksi',
      key: 'actions',
      width: 160,
      render: (_, record) => (
        <Space>
          <Typography.Link onClick={() => openEdit(record)}>Ubah</Typography.Link>
          <Popconfirm
            title={`Hapus ${label.toLowerCase()} ini?`}
            onConfirm={() => handleDelete(record)}
          >
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
      <ListPage<OrgMasterRecord>
        title={label}
        primaryAction={
          <Button type="primary" onClick={openCreate}>
            Tambah {label}
          </Button>
        }
        query={query}
        columns={columns}
        rowKey="id"
      />
      <FormDrawer<OrgMasterInput>
        open={drawerOpen}
        title={editing ? `Ubah ${label}` : `Tambah ${label}`}
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
