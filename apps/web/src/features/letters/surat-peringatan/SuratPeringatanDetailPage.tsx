import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Descriptions, Popconfirm, Space } from 'antd';
import { DetailPage } from '../../../components/DetailPage';
import { LockedAction } from '../../../components/LockedAction';
import { StatusTag } from '../../../components/StatusTag';
import { ApiErrorDisplay } from '../../../components/ApiErrorDisplay';
import { formatDate, formatIDR } from '../../../components/format';
import { useDownloadPdf } from '../../../hooks/useDownloadPdf';
import { describeApiError, type ApiErrorPresentation } from '../../../api/errors';
import { useRemoveSuratPeringatanMutation, useSuratPeringatanQuery } from './hooks';
import { SuratPeringatanFormDrawer } from './SuratPeringatanFormDrawer';
import { SP_LEVEL_LABELS } from './labels';

// FE-T19 (09_FRONTEND_STEPS.md), §15.10 B — R-06b (07_FRONTEND_RULES.md).
// No pending/approved workflow (see api.ts). The lock (referenced by a
// payslip line item, §11) is NOT derivable from this response — §13.5 B-06.
// Per the explicit instruction: Ubah/Hapus stay enabled unconditionally, no
// client-side guess at whether this record is locked. A 409 is caught and
// shown via describeApiError() (surface:'modal'), server wording as-is.
export function SuratPeringatanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const query = useSuratPeringatanQuery(id);
  const { download, downloading } = useDownloadPdf();
  const removeMutation = useRemoveSuratPeringatanMutation();

  const [editOpen, setEditOpen] = useState(false);
  const [actionError, setActionError] = useState<ApiErrorPresentation | null>(null);

  const record = query.data;

  const handleDelete = async () => {
    if (!id) return;
    setActionError(null);
    try {
      await removeMutation.mutateAsync(id);
      navigate('/letters/surat-peringatan');
    } catch (err) {
      setActionError(describeApiError(err));
    }
  };

  return (
    <>
      <DetailPage
        title="Surat Peringatan"
        backTo="/letters/surat-peringatan"
        query={query}
        actions={
          <Space>
            <LockedAction
              locked={record ? !record.pdfPath : true}
              reason="PDF belum tersedia — sedang dibuat."
              loading={downloading}
              onClick={() =>
                record && download(`/surat-peringatan/${record.id}/pdf`, `surat-peringatan-${record.id}.pdf`)
              }
            >
              Unduh PDF
            </LockedAction>
            {/* R-06b — always enabled; the server's 409 (if this SP's
                sanction already reached a payslip) is the actual authority. */}
            <Button onClick={() => setEditOpen(true)}>Ubah</Button>
            <Popconfirm title="Hapus surat peringatan ini?" onConfirm={handleDelete}>
              <Button danger>Hapus</Button>
            </Popconfirm>
          </Space>
        }
        renderSummary={(data) => (
          <Descriptions bordered column={2} size="small">
            <Descriptions.Item label="Karyawan">{data.employee?.name ?? data.employeeId}</Descriptions.Item>
            <Descriptions.Item label="Tingkat">
              <StatusTag value={data.level} labels={SP_LEVEL_LABELS} />
            </Descriptions.Item>
            <Descriptions.Item label="Tanggal Terbit">{formatDate(data.issueDate)}</Descriptions.Item>
            <Descriptions.Item label="Diterbitkan Oleh (User ID)">{data.issuedBy}</Descriptions.Item>
            <Descriptions.Item label="Komponen Sanksi">
              {data.sanctionComponent?.name ?? '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Nominal Sanksi">
              {data.sanctionAmount ? formatIDR(Number(data.sanctionAmount)) : '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Uraian Pelanggaran" span={2}>
              {data.violationDescription}
            </Descriptions.Item>
          </Descriptions>
        )}
      />
      {record && (
        <SuratPeringatanFormDrawer
          open={editOpen}
          onClose={() => setEditOpen(false)}
          suratPeringatan={record}
        />
      )}
      <ApiErrorDisplay error={actionError} onDismiss={() => setActionError(null)} />
    </>
  );
}
