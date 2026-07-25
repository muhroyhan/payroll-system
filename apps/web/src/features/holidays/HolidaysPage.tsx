import { useState } from 'react';
import { Alert, Button, DatePicker, Form, Input, Popconfirm, Space, Switch, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs, { type Dayjs } from 'dayjs';
import { HolidaySource } from '@payroll-system/shared-types';
import { ListPage } from '../../components/ListPage';
import { FormDrawer } from '../../components/FormDrawer';
import { LockedAction } from '../../components/LockedAction';
import { StatusTag } from '../../components/StatusTag';
import { formatDate } from '../../components/format';
import { describeApiError } from '../../api/errors';
import { useAuth } from '../auth/useAuth';
import {
  useCreateHolidayMutation,
  useHolidaysQuery,
  useRemoveHolidayMutation,
  useSyncHolidaysMutation,
  useUpdateHolidayMutation,
} from './hooks';
import { holidayToRuntimeFormValues, runtimeFormValuesToApi, type HolidayFormRuntimeValues } from './formValues';
import { HOLIDAY_SOURCE_LABELS } from './labels';
import type { Holiday, HolidaySyncResult } from './api';

// FE-T11 (09_FRONTEND_STEPS.md), §15.7 (08_FRONTEND_STRUCTURE.md). Unlike
// the scope masters, holidays ARE freely editable/deletable (§5.7) — this
// is a plain CRUD list, not the EffectiveDatedMasterPage archetype.
export function HolidaysPage() {
  const { isAdmin } = useAuth();
  const [year, setYear] = useState<Dayjs>(() => dayjs());

  const from = year.startOf('year').format('YYYY-MM-DD');
  const to = year.endOf('year').format('YYYY-MM-DD');
  const holidaysQuery = useHolidaysQuery(from, to);

  const createMutation = useCreateHolidayMutation();
  const updateMutation = useUpdateHolidayMutation();
  const removeMutation = useRemoveHolidayMutation();
  const syncMutation = useSyncHolidaysMutation();

  const [form] = Form.useForm<HolidayFormRuntimeValues>();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Holiday | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<HolidaySyncResult | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setDrawerOpen(true);
  };

  const openEdit = (record: Holiday) => {
    setEditing(record);
    form.setFieldsValue(holidayToRuntimeFormValues(record));
    setDrawerOpen(true);
  };

  const handleFinish = async (values: HolidayFormRuntimeValues) => {
    const payload = runtimeFormValuesToApi(values);
    if (editing) {
      await updateMutation.mutateAsync({ id: editing.id, input: payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
  };

  const handleDelete = async (record: Holiday) => {
    setDeleteError(null);
    try {
      await removeMutation.mutateAsync(record.id);
    } catch (err) {
      setDeleteError(describeApiError(err).title);
    }
  };

  const handleSync = async () => {
    setSyncError(null);
    setSyncResult(null);
    try {
      const result = await syncMutation.mutateAsync(year.year());
      setSyncResult(result);
    } catch (err) {
      setSyncError(describeApiError(err).title);
    }
  };

  const columns: ColumnsType<Holiday> = [
    { title: 'Tanggal', dataIndex: 'date', key: 'date', render: (value: string) => formatDate(value) },
    { title: 'Nama', dataIndex: 'name', key: 'name' },
    {
      title: 'Sumber',
      key: 'source',
      render: (_, record) => <StatusTag value={record.source} labels={HOLIDAY_SOURCE_LABELS} />,
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
      render: (_, record) => (
        <Space>
          <Typography.Link onClick={() => openEdit(record)}>Ubah</Typography.Link>
          <Popconfirm title="Hapus hari libur ini?" onConfirm={() => handleDelete(record)}>
            <Typography.Link>Hapus</Typography.Link>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="Sinkronisasi tidak pernah menimpa hari libur manual."
        description={
          <>
            Baris bertanda <StatusTag value={HolidaySource.MANUAL} labels={HOLIDAY_SOURCE_LABELS} /> (dibuat
            atau diedit langsung oleh HR — misalnya cuti bersama atau Nyepi) tidak akan pernah
            diganti saat sinkronisasi dijalankan, meskipun tanggalnya sama dengan entri di feed
            Google Calendar.
          </>
        }
      />

      {syncResult && (
        <Alert
          style={{ marginBottom: 16 }}
          type="success"
          showIcon
          closable
          onClose={() => setSyncResult(null)}
          message={`Sinkronisasi selesai — ${syncResult.created} dibuat, ${syncResult.updated} diperbarui, ${syncResult.skippedManual} dilewati (manual), dari ${syncResult.fetched} entri di feed.`}
        />
      )}
      {syncError && (
        <Alert
          style={{ marginBottom: 16 }}
          type="error"
          showIcon
          closable
          onClose={() => setSyncError(null)}
          message={syncError}
        />
      )}
      {deleteError && (
        <Alert
          style={{ marginBottom: 16 }}
          type="error"
          showIcon
          closable
          onClose={() => setDeleteError(null)}
          message={deleteError}
        />
      )}

      <ListPage<Holiday>
        title="Hari Libur"
        filters={
          <Space>
            <DatePicker
              picker="year"
              value={year}
              onChange={(value) => value && setYear(value)}
              allowClear={false}
            />
            {/* R-11 (07_FRONTEND_RULES.md) — admin-only action inside an
                otherwise A+H screen: disabled + tooltip for HR staff, never
                hidden. */}
            <LockedAction
              locked={!isAdmin}
              reason="Hanya admin yang dapat menyinkronkan hari libur dari Google Calendar."
              loading={syncMutation.isPending}
              onClick={handleSync}
            >
              Sinkronkan dari Google Calendar
            </LockedAction>
          </Space>
        }
        primaryAction={
          <Button type="primary" onClick={openCreate}>
            Tambah Hari Libur
          </Button>
        }
        query={holidaysQuery}
        columns={columns}
        rowKey="id"
        emptyDescription={`Belum ada hari libur untuk tahun ${year.year()}.`}
      />

      <FormDrawer<HolidayFormRuntimeValues>
        open={drawerOpen}
        title={editing ? 'Ubah Hari Libur' : 'Tambah Hari Libur'}
        onClose={() => setDrawerOpen(false)}
        onFinish={handleFinish}
        form={form}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
      >
        <Form.Item
          name="date"
          label="Tanggal"
          rules={[{ required: true, message: 'Tanggal wajib diisi' }]}
        >
          <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
        </Form.Item>
        <Form.Item
          name="name"
          label="Nama"
          rules={[{ required: true, message: 'Nama wajib diisi' }]}
        >
          <Input />
        </Form.Item>
        <Form.Item name="isActive" label="Aktif" valuePropName="checked">
          <Switch />
        </Form.Item>
      </FormDrawer>
    </div>
  );
}
