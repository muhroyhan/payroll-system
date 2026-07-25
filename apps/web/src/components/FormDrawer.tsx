import { useState, type ReactNode } from 'react';
import { Alert, Button, Drawer, Form, Modal, Space, type FormInstance } from 'antd';
import {
  FORM_ERROR_KEY,
  describeApiError,
  toAntdFormFields,
  type ApiErrorPresentation,
} from '../api/errors';

interface FormDrawerProps<TValues extends object> {
  open: boolean;
  title: string;
  onClose: () => void;
  /** Wrap the mutation's mutateAsync here — this component never calls
   *  apiClient/axios directly (R-08). */
  onFinish: (values: TValues) => Promise<void>;
  form: FormInstance<TValues>;
  children: ReactNode;
  width?: number;
  confirmLoading?: boolean;
}

// §15.0 (08_FRONTEND_STRUCTURE.md) — the Form (create/edit) archetype in its
// Drawer shape, for short forms. Centralizes the R-04 error handling every
// writable screen needs: a 400 maps its fieldErrors onto the antd Form via
// setFields (R-02 — antd Form is the only form layer), and a 409 (a §11
// lock, a state-machine violation, a uniqueness clash) surfaces as a
// persistent Modal — never a raw error string, never a 3-second toast.
export function FormDrawer<TValues extends object>({
  open,
  title,
  onClose,
  onFinish,
  form,
  children,
  width = 480,
  confirmLoading,
}: FormDrawerProps<TValues>) {
  const [submitError, setSubmitError] = useState<ApiErrorPresentation | null>(null);

  const handleFinish = async (values: TValues) => {
    setSubmitError(null);
    try {
      await onFinish(values);
      form.resetFields();
      onClose();
    } catch (err) {
      const presentation = describeApiError(err);
      if (presentation.kind === 'validation') {
        // toAntdFormFields maps field names the backend returned at runtime
        // (400's message[], api/errors.ts) — antd's Form<TValues>.setFields
        // wants `name` typed as a path into TValues, which can't be checked
        // statically against data that only exists at request time. The
        // backend DTO's property names are expected to match this form's
        // Form.Item `name`s 1:1; the cast bridges that runtime contract.
        form.setFields(
          toAntdFormFields(presentation.fieldErrors) as Parameters<
            typeof form.setFields
          >[0],
        );
      }
      setSubmitError(presentation);
    }
  };

  const handleClose = () => {
    setSubmitError(null);
    onClose();
  };

  const formErrorMessages = submitError?.fieldErrors?.[FORM_ERROR_KEY];

  return (
    <Drawer
      title={title}
      open={open}
      width={width}
      onClose={handleClose}
      destroyOnHidden
      extra={
        <Space>
          <Button onClick={handleClose}>Batal</Button>
          <Button type="primary" loading={confirmLoading} onClick={() => form.submit()}>
            Simpan
          </Button>
        </Space>
      }
    >
      {submitError && submitError.kind !== 'conflict' && (
        <Alert
          style={{ marginBottom: 16 }}
          type="error"
          showIcon
          closable
          onClose={() => setSubmitError(null)}
          message={submitError.title}
          description={formErrorMessages?.join(' ') ?? submitError.detail}
        />
      )}
      {submitError?.kind === 'conflict' && (
        <Modal
          open
          title="Tidak dapat disimpan"
          onOk={() => setSubmitError(null)}
          onCancel={() => setSubmitError(null)}
          cancelButtonProps={{ style: { display: 'none' } }}
        >
          <Alert type="warning" showIcon message={submitError.title} />
        </Modal>
      )}
      <Form<TValues> form={form} layout="vertical" onFinish={handleFinish}>
        {children}
      </Form>
    </Drawer>
  );
}
