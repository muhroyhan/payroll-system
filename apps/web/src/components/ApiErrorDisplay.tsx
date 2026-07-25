import { Alert, Modal } from 'antd';
import type { ApiErrorPresentation } from '../api/errors';

interface ApiErrorDisplayProps {
  error: ApiErrorPresentation | null;
  onDismiss: () => void;
}

// R-04 (07_FRONTEND_RULES.md) — renders a describeApiError() result per its
// own `surface`: 'modal' is the persistent, dismiss-to-continue explanation
// §11 locks and state-machine violations need (never a transient toast);
// everything else is a closable inline Alert. One place so a 409's
// presentation stays consistent wherever it's triggered from an action
// button rather than a form (FormDrawer already covers the form case).
export function ApiErrorDisplay({ error, onDismiss }: ApiErrorDisplayProps) {
  if (!error) return null;

  if (error.surface === 'modal') {
    return (
      <Modal
        open
        title="Tidak dapat dilanjutkan"
        onOk={onDismiss}
        onCancel={onDismiss}
        cancelButtonProps={{ style: { display: 'none' } }}
      >
        <Alert type="warning" showIcon message={error.title} description={error.detail} />
      </Modal>
    );
  }

  return (
    <Alert
      style={{ marginBottom: 16 }}
      type="error"
      showIcon
      closable
      onClose={onDismiss}
      message={error.title}
      description={error.detail}
    />
  );
}
