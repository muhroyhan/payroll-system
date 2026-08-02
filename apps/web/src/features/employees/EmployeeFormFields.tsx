import {
  Col,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Switch,
  Typography,
  type FormInstance,
} from 'antd';
import { Gender, MaritalStatus, MAX_DEPENDENT_COUNT, type PtkpStatus } from '@payroll-system/shared-types';
import { StatusTag } from '../../components/StatusTag';
import { enumSelectOptions } from '../../components/enumSelectOptions';
import type { OrgMasterRecord } from '../organization/api';
import type { EmployeeFormRuntimeValues } from './formValues';
import {
  EMPLOYEE_ACTIVE_STATUS_LABELS,
  EMPLOYMENT_STATUS_LABELS,
  GENDER_LABELS,
  MARITAL_STATUS_LABELS,
  PTKP_STATUS_LABELS,
} from './labels';

interface EmployeeFormFieldsProps {
  form: FormInstance<EmployeeFormRuntimeValues>;
  orgOptions: {
    employeeTypes: OrgMasterRecord[];
    positions: OrgMasterRecord[];
    departments: OrgMasterRecord[];
    divisions: OrgMasterRecord[];
  };
  /** The server-derived PTKP status to show read-only when not overridden —
   *  only present in edit mode (a brand-new employee has none yet). R-10:
   *  never derive this client-side, only display what the API returned. */
  currentPtkpStatus?: PtkpStatus;
}

function toSelectOptions(records: OrgMasterRecord[]) {
  return records.map((record) => ({ value: record.id, label: record.name }));
}

// FE-T06 (09_FRONTEND_STEPS.md), §5.1a/§15.4 (08_FRONTEND_STRUCTURE.md) —
// collects the raw PTKP inputs and shows the server-derived ptkpStatus; it
// never runs the derivation itself (R-10). Shared between create and edit
// via FormDrawer (see EmployeeListPage.tsx) rather than two separate forms.
export function EmployeeFormFields({
  form,
  orgOptions,
  currentPtkpStatus,
}: EmployeeFormFieldsProps) {
  const gender = Form.useWatch('gender', form);
  const maritalStatus = Form.useWatch('maritalStatus', form);
  const ptkpManuallyOverridden = Form.useWatch('ptkpManuallyOverridden', form);
  const employeeName = Form.useWatch('name', form);

  // §5.1a: "only meaningful when gender = female and married" — this
  // condition is copied verbatim from that spec, not an invented UX rule.
  const showSpouseCertificate = gender === Gender.FEMALE && maritalStatus === MaritalStatus.MARRIED;

  return (
    <>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="name"
            label="Nama"
            rules={[{ required: true, message: 'Nama wajib diisi' }]}
          >
            <Input />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="nik"
            label="NIK"
            rules={[
              { required: true, message: 'NIK wajib diisi' },
              { len: 16, message: 'NIK harus 16 digit' },
            ]}
          >
            <Input maxLength={16} />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item name="npwp" label="NPWP">
            <Input maxLength={16} />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="employmentStatus"
            label="Status Kepegawaian"
            rules={[{ required: true, message: 'Status kepegawaian wajib dipilih' }]}
          >
            <Select options={enumSelectOptions(EMPLOYMENT_STATUS_LABELS)} />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="maritalStatus"
            label="Status Pernikahan"
            rules={[{ required: true, message: 'Status pernikahan wajib dipilih' }]}
          >
            <Select options={enumSelectOptions(MARITAL_STATUS_LABELS)} />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="gender"
            label="Jenis Kelamin"
            rules={[{ required: true, message: 'Jenis kelamin wajib dipilih' }]}
          >
            <Select options={enumSelectOptions(GENDER_LABELS)} />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="dependentCount"
            label="Jumlah Tanggungan"
            rules={[{ required: true, message: 'Jumlah tanggungan wajib diisi' }]}
          >
            <InputNumber min={0} max={MAX_DEPENDENT_COUNT} style={{ width: '100%' }} />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="wifeIncomeCombined"
            label="Penghasilan Digabung (NPWP Gabung)"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </Col>
      </Row>

      {showSpouseCertificate && (
        <Form.Item
          name="spouseNoIncomeCertificate"
          label="Surat Keterangan Suami Tidak Berpenghasilan"
          valuePropName="checked"
          extra="Menentukan status PTKP TK atau K untuk karyawan perempuan menikah (§5.1a)."
        >
          <Switch />
        </Form.Item>
      )}

      <Form.Item
        name="ptkpManuallyOverridden"
        label="Timpa Manual Status PTKP"
        valuePropName="checked"
        extra="Jika aktif, status PTKP tidak akan dihitung ulang otomatis saat data di atas berubah — pastikan sesuai dokumen pendukung karyawan."
      >
        <Switch />
      </Form.Item>

      {ptkpManuallyOverridden ? (
        <>
          <Form.Item
            name="ptkpStatus"
            label="Status PTKP"
            rules={[{ required: true, message: 'Status PTKP wajib dipilih saat ditimpa manual' }]}
          >
            <Select options={enumSelectOptions(PTKP_STATUS_LABELS)} />
          </Form.Item>
          {/* Audit-trail follow-up (dispute-traceability review, §D) — the
              API rejects activating the override without a reason
              (BadRequestException), only at the false -> true transition;
              shown/required here whenever the switch is on, since the form
              has no cheap way to know "was this already on before this
              edit" and resending the same reason on an unrelated edit is
              harmless (the service ignores it once already active). */}
          <Form.Item
            name="ptkpOverrideReason"
            label="Alasan Timpa Manual"
            rules={[{ required: true, message: 'Alasan wajib diisi saat mengaktifkan timpa manual' }]}
            extra="Dokumentasikan alasan (mis. rujukan dokumen/keputusan HR) — tercatat bersama nama & waktu pengaktifan."
          >
            <Input.TextArea rows={2} />
          </Form.Item>
        </>
      ) : (
        <Form.Item label="Status PTKP">
          {currentPtkpStatus ? (
            <StatusTag value={currentPtkpStatus} labels={PTKP_STATUS_LABELS} />
          ) : (
            <Typography.Text type="secondary">
              Akan dihitung otomatis oleh sistem setelah disimpan.
            </Typography.Text>
          )}
        </Form.Item>
      )}

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="employeeTypeId"
            label="Jenis Karyawan"
            rules={[{ required: true, message: 'Jenis karyawan wajib dipilih' }]}
          >
            <Select options={toSelectOptions(orgOptions.employeeTypes)} />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="positionId"
            label="Posisi"
            rules={[{ required: true, message: 'Posisi wajib dipilih' }]}
          >
            <Select options={toSelectOptions(orgOptions.positions)} />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="departmentId"
            label="Departemen"
            rules={[{ required: true, message: 'Departemen wajib dipilih' }]}
          >
            <Select options={toSelectOptions(orgOptions.departments)} />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="divisionId"
            label="Divisi"
            rules={[{ required: true, message: 'Divisi wajib dipilih' }]}
          >
            <Select options={toSelectOptions(orgOptions.divisions)} />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item name="location" label="Lokasi">
            <Input />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="status" label="Status Karyawan">
            <Select options={enumSelectOptions(EMPLOYEE_ACTIVE_STATUS_LABELS)} />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={8}>
          <Form.Item name="bankName" label="Nama Bank">
            <Input />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name="bankAccountNumber" label="No. Rekening">
            <Input />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item
            name="bankAccountHolderName"
            label="Nama Pemilik Rekening"
            dependencies={['name']}
            extra={
              employeeName && (
                <Typography.Link
                  onClick={() =>
                    form.setFieldValue('bankAccountHolderName', employeeName)
                  }
                >
                  Samakan dengan Nama Karyawan
                </Typography.Link>
              )
            }
            // EMP-013 — mirrors the server's rule (employees.service.ts's
            // assertBankAccountHolderNameMatches) so the mismatch surfaces
            // before submit, not just after a round trip; case-insensitive/
            // trimmed for the same reason the server is (bank statements
            // routinely come back in ALL CAPS).
            rules={[
              {
                validator: (_rule, value?: string) => {
                  if (!value) return Promise.resolve();
                  const currentName = (form.getFieldValue('name') as string) ?? '';
                  return currentName.trim().toLowerCase() === value.trim().toLowerCase()
                    ? Promise.resolve()
                    : Promise.reject(
                        new Error('Nama Pemilik Rekening Bank berbeda dengan Nama Karyawan'),
                      );
                },
              },
            ]}
          >
            <Input />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="startDate"
            label="Tanggal Mulai"
            rules={[{ required: true, message: 'Tanggal mulai wajib diisi' }]}
          >
            <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="endDate" label="Tanggal Selesai">
            <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
          </Form.Item>
        </Col>
      </Row>
    </>
  );
}
