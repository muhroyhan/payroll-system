import { useState } from 'react';
import { Alert, Button, DatePicker, Form, Input, Popconfirm, Space, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs, { type Dayjs } from 'dayjs';
import { ListPage } from '../../components/ListPage';
import { FormDrawer } from '../../components/FormDrawer';
import { formatDate } from '../../components/format';
import { describeApiError } from '../../api/errors';
import { EmployeeSelect } from '../employees/EmployeeSelect';
import {
  useCreateFingerprintMutation,
  useFingerprintsQuery,
  useRemoveFingerprintMutation,
  useUpdateFingerprintMutation,
} from './hooks';
import type { Fingerprint, FingerprintFormValues } from './api';

interface FingerprintFormRuntimeValues {
  employeeId: string;
  deviceUserId: string;
  deviceId: string;
  enrolledAt?: Dayjs;
}

function toApi(values: FingerprintFormRuntimeValues): FingerprintFormValues {
  return {
    employeeId: values.employeeId,
    deviceUserId: values.deviceUserId,
    deviceId: values.deviceId,
    enrolledAt: values.enrolledAt ? values.enrolledAt.toISOString() : undefined,
  };
}

// FE-T15 (09_FRONTEND_STEPS.md), §15.8 A (08_FRONTEND_STRUCTURE.md) — plain
// CRUD: employee_id ↔ device_user_id + device_id enrolment mapping.
export function FingerprintsPage() {
  const query = useFingerprintsQuery();
  const createMutation = useCreateFingerprintMutation();
  const updateMutation = useUpdateFingerprintMutation();
  const removeMutation = useRemoveFingerprintMutation();

  const [form] = Form.useForm<FingerprintFormRuntimeValues>();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Fingerprint | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setDrawerOpen(true);
  };

  const openEdit = (record: Fingerprint) => {
    setEditing(record);
    form.setFieldsValue({
      employeeId: record.employeeId,
      deviceUserId: record.deviceUserId,
      deviceId: record.deviceId,
      enrolledAt: dayjs(record.enrolledAt),
    });
    setDrawerOpen(true);
  };

  const handleFinish = async (values: FingerprintFormRuntimeValues) => {
    const payload = toApi(values);
    if (editing) {
      await updateMutation.mutateAsync({ id: editing.id, input: payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
  };

  const handleDelete = async (record: Fingerprint) => {
    setDeleteError(null);
    try {
      await removeMutation.mutateAsync(record.id);
    } catch (err) {
      setDeleteError(describeApiError(err).title);
    }
  };

  const columns: ColumnsType<Fingerprint> = [
    { title: 'Karyawan', key: 'employee', render: (_, record) => record.employee?.name ?? record.employeeId },
    { title: 'Device User ID', dataIndex: 'deviceUserId', key: 'deviceUserId' },
    { title: 'Device ID', dataIndex: 'deviceId', key: 'deviceId' },
    {
      title: 'Terdaftar Sejak',
      dataIndex: 'enrolledAt',
      key: 'enrolledAt',
      render: (value: string) => formatDate(value),
    },
    {
      title: 'Aksi',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Typography.Link onClick={() => openEdit(record)}>Ubah</Typography.Link>
          <Popconfirm title="Hapus pendaftaran sidik jari ini?" onConfirm={() => handleDelete(record)}>
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
      <ListPage<Fingerprint>
        title="Sidik Jari"
        primaryAction={
          <Button type="primary" onClick={openCreate}>
            Tambah Pendaftaran
          </Button>
        }
        query={query}
        columns={columns}
        rowKey="id"
        emptyDescription="Belum ada sidik jari terdaftar."
      />
      <FormDrawer<FingerprintFormRuntimeValues>
        open={drawerOpen}
        title={editing ? 'Ubah Pendaftaran Sidik Jari' : 'Tambah Pendaftaran Sidik Jari'}
        onClose={() => setDrawerOpen(false)}
        onFinish={handleFinish}
        form={form}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
      >
        <Form.Item
          name="employeeId"
          label="Karyawan"
          rules={[{ required: true, message: 'Karyawan wajib dipilih' }]}
        >
          <EmployeeSelect />
        </Form.Item>
        <Form.Item
          name="deviceUserId"
          label="Device User ID"
          rules={[{ required: true, message: 'Device User ID wajib diisi' }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          name="deviceId"
          label="Device ID"
          rules={[{ required: true, message: 'Device ID wajib diisi' }]}
        >
          <Input />
        </Form.Item>
        <Form.Item name="enrolledAt" label="Terdaftar Sejak">
          <DatePicker showTime style={{ width: '100%' }} />
        </Form.Item>
      </FormDrawer>
    </div>
  );
}
