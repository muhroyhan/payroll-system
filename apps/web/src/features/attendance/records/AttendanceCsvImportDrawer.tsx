import { useEffect, useState } from 'react';
import { Alert, Button, Drawer, Form, Input, Space, Switch, Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useBulkImportAttendanceRecordsMutation } from './hooks';
import { describeApiError, type ApiErrorPresentation } from '../../../api/errors';
import type { AttendanceRecordFormValues, BulkImportAttendanceResult } from './api';

interface AttendanceCsvImportDrawerProps {
  open: boolean;
  onClose: () => void;
}

const PLACEHOLDER = `[
  {
    "employeeId": "00000000-0000-0000-0000-000000000000",
    "date": "2026-01-05",
    "clockIn": "2026-01-05T08:00:00Z",
    "clockOut": "2026-01-05T17:00:00Z"
  }
]`;

interface ConflictRow {
  key: number;
  message: string;
}

const conflictColumns: ColumnsType<ConflictRow> = [
  { title: 'Baris Gagal', dataIndex: 'message', key: 'message' },
];

// ATT-006 (05_BOUNDARIES_AND_TESTS.md) — §15.8 C (08_FRONTEND_STRUCTURE.md)
// lists this as a screen alongside Rekonsiliasi/Tambah Manual, distinct from
// FE-T17's scope note that only deferred it, not decided against it (no
// "not a screen" annotation like attendance-raw-logs' /bulk cron path has).
// Genuinely different input shape from RawLogsPage's file-upload import
// (RAWLOG-001): this endpoint's "csv-import" name is historical — the body
// is a JSON array of already-reconciled rows from an external system, not a
// spreadsheet to parse, so a JSON textarea is the natural input, not
// Upload.Dragger. Stays open after submit (doesn't auto-close like the
// all-or-nothing Reconcile/Manual-entry drawers) because partial success —
// some rows import, some conflict — is the NORMAL outcome here, not a toast
// to dismiss (same rule as EmployeeImportPage/RawLogsPage).
export function AttendanceCsvImportDrawer({ open, onClose }: AttendanceCsvImportDrawerProps) {
  const [jsonText, setJsonText] = useState('');
  const [overwrite, setOverwrite] = useState(false);
  const [reason, setReason] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<ApiErrorPresentation | null>(null);
  const [result, setResult] = useState<BulkImportAttendanceResult | null>(null);

  const importMutation = useBulkImportAttendanceRecordsMutation();

  useEffect(() => {
    if (open) {
      setJsonText('');
      setOverwrite(false);
      setReason('');
      setParseError(null);
      setApiError(null);
      setResult(null);
    }
  }, [open]);

  const handleSubmit = async () => {
    setParseError(null);
    setApiError(null);
    setResult(null);

    let records: AttendanceRecordFormValues[];
    try {
      const parsed: unknown = JSON.parse(jsonText);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        setParseError('Input harus berupa array JSON berisi minimal satu baris.');
        return;
      }
      records = parsed as AttendanceRecordFormValues[];
    } catch {
      setParseError('JSON tidak valid — periksa kembali format array-nya.');
      return;
    }

    try {
      const outcome = await importMutation.mutateAsync({
        records,
        overwrite,
        reason: reason || undefined,
      });
      setResult(outcome);
    } catch (err) {
      setApiError(describeApiError(err));
    }
  };

  return (
    <Drawer
      title="Impor CSV Absensi"
      open={open}
      onClose={onClose}
      destroyOnHidden
      width={560}
      extra={
        <Space>
          <Button onClick={onClose}>Tutup</Button>
          <Button type="primary" loading={importMutation.isPending} onClick={handleSubmit}>
            Impor
          </Button>
        </Space>
      }
    >
      <Typography.Paragraph type="secondary">
        Tempel array JSON baris absensi yang sudah direkonsiliasi (mis. dari sistem absensi
        eksternal). Setiap baris butuh minimal <code>employeeId</code> (UUID karyawan) dan{' '}
        <code>date</code> (YYYY-MM-DD).
      </Typography.Paragraph>

      <Form layout="vertical">
        <Form.Item label="Data (Array JSON)">
          <Input.TextArea
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            placeholder={PLACEHOLDER}
            autoSize={{ minRows: 8, maxRows: 16 }}
            style={{ fontFamily: 'monospace', fontSize: 12 }}
          />
        </Form.Item>
        <Form.Item label="Alasan (opsional)">
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Mis. impor absensi bulan lalu dari sistem lama"
          />
        </Form.Item>
        <Form.Item label="Timpa data yang sudah ada dari sumber lain">
          <Switch checked={overwrite} onChange={setOverwrite} />
        </Form.Item>
      </Form>

      {parseError && (
        <Alert style={{ marginBottom: 16 }} type="error" showIcon message={parseError} />
      )}

      {apiError && (
        <Alert
          style={{ marginBottom: 16 }}
          type="error"
          showIcon
          closable
          onClose={() => setApiError(null)}
          message={apiError.title}
          description={apiError.detail}
        />
      )}

      {result && (
        <div>
          <Alert
            type={result.conflicts.length === 0 ? 'success' : 'warning'}
            showIcon
            message={`${result.createdOrUpdated} baris berhasil diimpor/diperbarui, ${result.conflicts.length} baris gagal.`}
            description={
              result.conflicts.length > 0
                ? 'Baris yang gagal biasanya karena bentrok sumber data lain (aktifkan "Timpa data" untuk menimpanya) atau periode terkunci (§11).'
                : undefined
            }
          />
          {result.conflicts.length > 0 && (
            <Table<ConflictRow>
              style={{ marginTop: 16 }}
              size="small"
              rowKey="key"
              columns={conflictColumns}
              dataSource={result.conflicts.map((message, key) => ({ key, message }))}
              pagination={{ pageSize: 10 }}
            />
          )}
        </div>
      )}
    </Drawer>
  );
}
