import { useEffect, useState } from 'react';
import { Alert, Button, Form, Modal, Select, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { YearSelect } from '../../../components/YearSelect';
import { useLeaveTypesQuery } from '../leave-types/hooks';
import { useResolveLeaveBalancesForLeaveTypeMutation } from './hooks';
import { describeApiError, type ApiErrorPresentation } from '../../../api/errors';
import type { ResolveLeaveBalanceRowResult } from './api';

interface ResolveBulkBalanceFormValues {
  leaveTypeId: string;
  year: number;
}

interface ResolveBulkBalanceModalProps {
  open: boolean;
  onClose: () => void;
}

const resultColumns: ColumnsType<ResolveLeaveBalanceRowResult> = [
  { title: 'Employee ID', dataIndex: 'employeeId', key: 'employeeId' },
  {
    title: 'Hasil',
    key: 'ok',
    render: (_, row) => (row.ok ? 'Berhasil' : 'Gagal'),
  },
  { title: 'Keterangan', dataIndex: 'message', key: 'message', render: (v) => v ?? '—' },
];

// FE-T13 (09_FRONTEND_STEPS.md), §15.9 — the year-start bulk seeding
// workflow: one leave type + year against every ACTIVE employee. Partial
// failure is normal (one employee missing a resolvable policy shouldn't
// hide the other 199 succeeding), so the result renders as a per-row table
// — same pattern as EmployeeImportPage's import result, not a single toast.
// This does NOT use FormDrawer because the result must stay visible after
// submit, not auto-close the dialog.
export function ResolveBulkBalanceModal({ open, onClose }: ResolveBulkBalanceModalProps) {
  const [form] = Form.useForm<ResolveBulkBalanceFormValues>();
  const leaveTypesQuery = useLeaveTypesQuery();
  const resolveMutation = useResolveLeaveBalancesForLeaveTypeMutation();

  const [results, setResults] = useState<ResolveLeaveBalanceRowResult[] | null>(null);
  const [error, setError] = useState<ApiErrorPresentation | null>(null);

  useEffect(() => {
    if (open) {
      form.resetFields();
      setResults(null);
      setError(null);
    }
  }, [open, form]);

  const handleFinish = async (values: ResolveBulkBalanceFormValues) => {
    setError(null);
    try {
      const rows = await resolveMutation.mutateAsync(values);
      setResults(rows);
    } catch (err) {
      setError(describeApiError(err));
    }
  };

  return (
    <Modal
      open={open}
      title="Resolve Saldo Cuti — Massal (Awal Tahun)"
      onCancel={onClose}
      footer={
        <Button type="primary" loading={resolveMutation.isPending} onClick={() => form.submit()}>
          Jalankan
        </Button>
      }
    >
      <Form<ResolveBulkBalanceFormValues> form={form} layout="vertical" onFinish={handleFinish}>
        <Form.Item
          name="leaveTypeId"
          label="Jenis Cuti"
          rules={[{ required: true, message: 'Jenis cuti wajib dipilih' }]}
        >
          <Select
            options={(leaveTypesQuery.data ?? []).map((type) => ({
              value: type.id,
              label: type.name,
            }))}
          />
        </Form.Item>
        <Form.Item
          name="year"
          label="Tahun"
          rules={[{ required: true, message: 'Tahun wajib diisi' }]}
        >
          <YearSelect style={{ width: '100%' }} />
        </Form.Item>
      </Form>

      {error && (
        <Alert
          style={{ marginTop: 16 }}
          type="error"
          showIcon
          message={error.title}
          description={error.detail}
        />
      )}

      {results && (
        <>
          <Alert
            style={{ marginTop: 16, marginBottom: 16 }}
            type={results.every((row) => row.ok) ? 'success' : 'warning'}
            showIcon
            message={`${results.filter((row) => row.ok).length} dari ${results.length} karyawan berhasil di-resolve.`}
          />
          <Table<ResolveLeaveBalanceRowResult>
            rowKey="employeeId"
            size="small"
            columns={resultColumns}
            dataSource={results}
            pagination={{ pageSize: 10 }}
          />
        </>
      )}
    </Modal>
  );
}
