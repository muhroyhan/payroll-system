import { useState } from 'react';
import { Alert, Table, Typography, Upload, type UploadProps } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useQueryClient } from '@tanstack/react-query';
import { useImportEmployeesMutation } from './hooks';
import { describeApiError, type ApiErrorPresentation } from '../../api/errors';
import type { BulkImportResult, ImportRowError } from '../../api/bulkImport';

const errorColumns: ColumnsType<ImportRowError> = [
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

// FE-T07 (09_FRONTEND_STEPS.md) — POST /employees/import (multipart, field
// "file"). Partial failure is the NORMAL outcome (one bad row doesn't block
// the other 199, per apps/api's BulkImportResult), so the result renders as
// a per-row table, never collapsed into a single pass/fail toast.
export function EmployeeImportPage() {
  const importMutation = useImportEmployeesMutation();
  const queryClient = useQueryClient();
  const [result, setResult] = useState<BulkImportResult | null>(null);
  const [error, setError] = useState<ApiErrorPresentation | null>(null);

  const handleUpload: UploadProps['customRequest'] = async (options) => {
    setError(null);
    setResult(null);
    try {
      const importResult = await importMutation.mutateAsync(options.file as File);
      setResult(importResult);
      // The import itself may be entirely, partially, or not at all
      // successful — refresh the list cache regardless so whatever did
      // succeed shows up immediately (R-01: invalidate, never hand-patch).
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    } catch (err) {
      setError(describeApiError(err));
    }
  };

  return (
    <div>
      <Typography.Title level={4}>Impor Karyawan</Typography.Title>
      <Typography.Paragraph type="secondary">
        Unggah file Excel/CSV karyawan. Baris yang gagal tidak menghentikan proses — baris
        lainnya tetap diimpor, dan hasil per baris ditampilkan di bawah.
      </Typography.Paragraph>

      <Upload.Dragger
        accept=".xlsx,.xls,.csv"
        multiple={false}
        showUploadList={false}
        customRequest={handleUpload}
        disabled={importMutation.isPending}
      >
        <p>Klik atau seret file ke sini untuk mengunggah</p>
      </Upload.Dragger>

      {error && (
        <Alert
          style={{ marginTop: 16 }}
          type="error"
          showIcon
          message={error.title}
          description={error.detail}
        />
      )}

      {result && (
        <div style={{ marginTop: 24 }}>
          <Alert
            type={result.failureCount === 0 ? 'success' : 'warning'}
            showIcon
            message={`Total ${result.totalRows} baris — ${result.successCount} berhasil, ${result.failureCount} gagal.`}
          />
          {result.errors.length > 0 && (
            <Table<ImportRowError>
              style={{ marginTop: 16 }}
              rowKey="row"
              columns={errorColumns}
              dataSource={result.errors}
              pagination={{ pageSize: 20 }}
            />
          )}
        </div>
      )}
    </div>
  );
}
