import { useState } from 'react';
import {
  Alert,
  Button,
  DatePicker,
  Empty,
  Form,
  Input,
  Popconfirm,
  Select,
  Space,
  Table,
  Tooltip,
  Typography,
  Upload,
  type UploadProps,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { Dayjs } from 'dayjs';
import { ListPage } from '../../../components/ListPage';
import { FormDrawer } from '../../../components/FormDrawer';
import { StatusTag } from '../../../components/StatusTag';
import { enumSelectOptions } from '../../../components/enumSelectOptions';
import { formatDate } from '../../../components/format';
import { describeApiError, type ApiErrorPresentation } from '../../../api/errors';
import type { BulkImportResult, ImportRowError } from '../../../api/bulkImport';
import {
  useAttendanceRawLogsQuery,
  useCreateAttendanceRawLogMutation,
  useImportAttendanceRawLogsMutation,
  useRemoveAttendanceRawLogMutation,
} from './hooks';
import { SCAN_TYPE_LABELS } from './labels';
import type { AttendanceRawLog, AttendanceRawLogFormValues } from './api';

interface RawLogFormRuntimeValues {
  deviceUserId: string;
  deviceId: string;
  scanTime: Dayjs;
  scanType?: AttendanceRawLogFormValues['scanType'];
}

const importErrorColumns: ColumnsType<ImportRowError> = [
  { title: 'Baris', dataIndex: 'row', key: 'row', width: 100 },
  {
    title: 'Alasan',
    dataIndex: 'messages',
    key: 'messages',
    render: (messages: string[]) => (
      <ul style={{ margin: 0, paddingLeft: 16 }}>
        {messages.map((message, index) => (
          <li key={index}>{message}</li>
        ))}
      </ul>
    ),
  },
];

// FE-T16 (09_FRONTEND_STEPS.md), §15.8 B (08_FRONTEND_STRUCTURE.md). R-08
// (07_FRONTEND_RULES.md) — this table grows ~2 rows/employee/working day;
// the query stays disabled until a filter is entered (useAttendanceRawLogsQuery).
export function RawLogsPage() {
  const [deviceUserId, setDeviceUserId] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const hasFilter = !!deviceUserId || !!deviceId;

  const query = useAttendanceRawLogsQuery(deviceUserId || undefined, deviceId || undefined);
  const createMutation = useCreateAttendanceRawLogMutation();
  const removeMutation = useRemoveAttendanceRawLogMutation();
  const importMutation = useImportAttendanceRawLogsMutation();

  const [form] = Form.useForm<RawLogFormRuntimeValues>();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [rowError, setRowError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<BulkImportResult | null>(null);
  const [importError, setImportError] = useState<ApiErrorPresentation | null>(null);

  const openCreate = () => {
    form.resetFields();
    setDrawerOpen(true);
  };

  const handleFinish = async (values: RawLogFormRuntimeValues) => {
    await createMutation.mutateAsync({
      deviceUserId: values.deviceUserId,
      deviceId: values.deviceId,
      scanTime: values.scanTime.toISOString(),
      scanType: values.scanType,
    });
  };

  const handleDelete = async (record: AttendanceRawLog) => {
    setRowError(null);
    try {
      await removeMutation.mutateAsync(record.id);
    } catch (err) {
      setRowError(describeApiError(err).title);
    }
  };

  const handleImport: UploadProps['customRequest'] = async (options) => {
    setImportError(null);
    setImportResult(null);
    try {
      const result = await importMutation.mutateAsync(options.file as File);
      setImportResult(result);
    } catch (err) {
      setImportError(describeApiError(err));
    }
  };

  const columns: ColumnsType<AttendanceRawLog> = [
    { title: 'Device User ID', dataIndex: 'deviceUserId', key: 'deviceUserId' },
    { title: 'Device ID', dataIndex: 'deviceId', key: 'deviceId' },
    {
      title: 'Waktu Scan',
      dataIndex: 'scanTime',
      key: 'scanTime',
      render: (value: string) => formatDate(value),
    },
    {
      title: 'Tipe Scan',
      key: 'scanType',
      render: (_, record) =>
        record.scanType ? (
          <StatusTag value={record.scanType} labels={SCAN_TYPE_LABELS} />
        ) : (
          // §5.3 — many devices don't report in/out per scan; reconciliation
          // infers it from scan order per day. Null here is a legitimate
          // device limitation, not an error.
          <Tooltip title="Perangkat ini tidak melaporkan tipe scan — urutan masuk/keluar disimpulkan otomatis saat rekonsiliasi.">
            <span>—</span>
          </Tooltip>
        ),
    },
    {
      title: 'Aksi',
      key: 'actions',
      render: (_, record) => (
        <Popconfirm title="Hapus log scan ini?" onConfirm={() => handleDelete(record)}>
          <Typography.Link>Hapus</Typography.Link>
        </Popconfirm>
      ),
    },
  ];

  return (
    <div>
      <Typography.Title level={4}>Log Absensi Mentah</Typography.Title>

      {rowError && (
        <Alert
          type="error"
          showIcon
          closable
          style={{ marginBottom: 16 }}
          message={rowError}
          onClose={() => setRowError(null)}
        />
      )}

      <Space style={{ marginBottom: 16 }} wrap>
        <Input
          placeholder="Device User ID"
          value={deviceUserId}
          onChange={(event) => setDeviceUserId(event.target.value)}
          style={{ width: 200 }}
          allowClear
        />
        <Input
          placeholder="Device ID"
          value={deviceId}
          onChange={(event) => setDeviceId(event.target.value)}
          style={{ width: 200 }}
          allowClear
        />
        <Button type="primary" onClick={openCreate}>
          Tambah Manual
        </Button>
      </Space>

      <Upload.Dragger
        accept=".xlsx,.xls,.csv"
        multiple={false}
        showUploadList={false}
        customRequest={handleImport}
        disabled={importMutation.isPending}
        style={{ marginBottom: 16 }}
      >
        <p>Klik atau seret file ekspor perangkat ke sini untuk mengimpor</p>
      </Upload.Dragger>

      {importError && (
        <Alert
          style={{ marginBottom: 16 }}
          type="error"
          showIcon
          message={importError.title}
          description={importError.detail}
        />
      )}
      {importResult && (
        <div style={{ marginBottom: 16 }}>
          <Alert
            type={importResult.failureCount === 0 ? 'success' : 'warning'}
            showIcon
            message={`Total ${importResult.totalRows} baris — ${importResult.successCount} berhasil, ${importResult.failureCount} gagal.`}
          />
          {importResult.errors.length > 0 && (
            <Table<ImportRowError>
              style={{ marginTop: 16 }}
              rowKey="row"
              size="small"
              columns={importErrorColumns}
              dataSource={importResult.errors}
              pagination={{ pageSize: 20 }}
            />
          )}
        </div>
      )}

      {hasFilter ? (
        <ListPage<AttendanceRawLog>
          title="Hasil"
          query={query}
          columns={columns}
          rowKey="id"
          emptyDescription="Tidak ada log untuk filter ini."
        />
      ) : (
        <Empty description="Masukkan Device User ID atau Device ID di atas untuk menampilkan log." />
      )}

      <FormDrawer<RawLogFormRuntimeValues>
        open={drawerOpen}
        title="Tambah Log Manual"
        onClose={() => setDrawerOpen(false)}
        onFinish={handleFinish}
        form={form}
        confirmLoading={createMutation.isPending}
      >
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
        <Form.Item
          name="scanTime"
          label="Waktu Scan"
          rules={[{ required: true, message: 'Waktu scan wajib diisi' }]}
        >
          <DatePicker showTime style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="scanType" label="Tipe Scan (opsional)">
          <Select allowClear options={enumSelectOptions(SCAN_TYPE_LABELS)} />
        </Form.Item>
      </FormDrawer>
    </div>
  );
}
