import { useState } from 'react';
import { Button, Form, Input, InputNumber, Progress, Select, Space, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ListPage } from '../../../components/ListPage';
import { FormDrawer } from '../../../components/FormDrawer';
import { useEmployeesQuery } from '../../employees/hooks';
import { useLeaveBalancesQuery, useUpdateLeaveBalanceQuotaMutation } from './hooks';
import { ResolveOneBalanceDrawer } from './ResolveOneBalanceDrawer';
import { ResolveBulkBalanceModal } from './ResolveBulkBalanceModal';
import type { LeaveBalance } from './api';

interface QuotaFormValues {
  quota: number;
  reason: string;
}

// FE-T13 (09_FRONTEND_STEPS.md), §15.9 (08_FRONTEND_STRUCTURE.md). `used`
// has NO input anywhere on this screen — the API exposes only
// PUT /:id/quota (§11); it only ever moves via the leave request approval
// workflow (FE-T14).
export function LeaveBalancesPage() {
  const employeesQuery = useEmployeesQuery();
  const [employeeId, setEmployeeId] = useState<string>();
  const [year, setYear] = useState<number>(() => new Date().getFullYear());

  const balancesQuery = useLeaveBalancesQuery(employeeId, year);
  const updateQuotaMutation = useUpdateLeaveBalanceQuotaMutation();

  const [quotaForm] = Form.useForm<QuotaFormValues>();
  const [editing, setEditing] = useState<LeaveBalance | null>(null);
  const [resolveOneOpen, setResolveOneOpen] = useState(false);
  const [resolveBulkOpen, setResolveBulkOpen] = useState(false);

  const employeeName = (id: string) =>
    employeesQuery.data?.find((employee) => employee.id === id)?.name ?? id;

  const openQuotaEdit = (record: LeaveBalance) => {
    setEditing(record);
    quotaForm.resetFields();
    quotaForm.setFieldsValue({ quota: record.quota });
  };

  const handleQuotaFinish = async (values: QuotaFormValues) => {
    if (!editing) return;
    await updateQuotaMutation.mutateAsync({
      id: editing.id,
      quota: values.quota,
      reason: values.reason,
    });
  };

  const columns: ColumnsType<LeaveBalance> = [
    { title: 'Karyawan', key: 'employee', render: (_, record) => employeeName(record.employeeId) },
    { title: 'Jenis Cuti', key: 'leaveType', render: (_, record) => record.leaveType?.name ?? '—' },
    { title: 'Tahun', dataIndex: 'year', key: 'year' },
    { title: 'Kuota', dataIndex: 'quota', key: 'quota' },
    { title: 'Terpakai', dataIndex: 'used', key: 'used' },
    {
      title: 'Progres',
      key: 'progress',
      // A percentage ratio of two API-returned fields for display — the
      // same kind of arithmetic §15.11's kasbon repayment bar uses; R-07
      // still forbids computing a "sisa" figure or anything money-shaped.
      render: (_, record) => (
        <Progress percent={record.quota > 0 ? Math.round((record.used / record.quota) * 100) : 0} size="small" />
      ),
    },
    {
      title: 'Disesuaikan Manual',
      key: 'manuallyAdjusted',
      render: (_, record) =>
        record.manuallyAdjusted ? <Tag color="blue">Ya</Tag> : <Tag>Tidak</Tag>,
    },
    {
      title: 'Aksi',
      key: 'actions',
      render: (_, record) => (
        <Typography.Link onClick={() => openQuotaEdit(record)}>Ubah Kuota</Typography.Link>
      ),
    },
  ];

  return (
    <>
      <ListPage<LeaveBalance>
        title="Saldo Cuti"
        primaryAction={
          <Space>
            <Button onClick={() => setResolveOneOpen(true)}>Resolve Satu Karyawan</Button>
            <Button onClick={() => setResolveBulkOpen(true)}>Resolve Massal (Awal Tahun)</Button>
          </Space>
        }
        filters={
          <Space wrap>
            <Select
              allowClear
              placeholder="Karyawan"
              style={{ width: 220 }}
              showSearch
              optionFilterProp="label"
              options={(employeesQuery.data ?? []).map((employee) => ({
                value: employee.id,
                label: employee.name,
              }))}
              value={employeeId}
              onChange={setEmployeeId}
            />
            <InputNumber
              placeholder="Tahun"
              value={year}
              onChange={(value) => value && setYear(value)}
              min={2000}
              max={2100}
            />
          </Space>
        }
        query={balancesQuery}
        columns={columns}
        rowKey="id"
        emptyDescription="Belum ada saldo cuti untuk filter ini."
      />

      <FormDrawer<QuotaFormValues>
        open={!!editing}
        title={editing ? `Ubah Kuota — ${employeeName(editing.employeeId)}` : 'Ubah Kuota'}
        onClose={() => setEditing(null)}
        onFinish={handleQuotaFinish}
        form={quotaForm}
        confirmLoading={updateQuotaMutation.isPending}
      >
        <Form.Item
          name="quota"
          label="Kuota (hari)"
          rules={[{ required: true, message: 'Kuota wajib diisi' }]}
        >
          <InputNumber style={{ width: '100%' }} min={0} />
        </Form.Item>
        {/* LEAVEBAL-004/006 — required server-side (UpdateLeaveBalanceQuotaDto,
            min 5 chars); this screen had no field for it at all, so every
            submit 400'd. No `used` field here either — the API doesn't
            accept one (§11), it only ever moves via request approval. */}
        <Form.Item
          name="reason"
          label="Alasan Penyesuaian"
          rules={[
            { required: true, message: 'Alasan penyesuaian kuota wajib diisi' },
            { min: 5, message: 'Alasan penyesuaian kuota minimal 5 karakter' },
          ]}
        >
          <Input.TextArea rows={2} placeholder="Jelaskan alasan perubahan kuota ini…" />
        </Form.Item>
      </FormDrawer>

      <ResolveOneBalanceDrawer open={resolveOneOpen} onClose={() => setResolveOneOpen(false)} />
      <ResolveBulkBalanceModal open={resolveBulkOpen} onClose={() => setResolveBulkOpen(false)} />
    </>
  );
}
