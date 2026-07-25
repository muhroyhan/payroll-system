import { Modal } from 'antd';
import type { ApiErrorPresentation } from '../../../api/errors';

// §11/TC-ATT-07 — a source-mismatch 409 ("already exists from source X —
// pass overwrite=true...") is a normal, expected outcome here, not a
// failure: it means a different ingestion path already wrote this day. Per
// R-04 (07_FRONTEND_RULES.md) this must be a confirm dialog asking whether
// to replace it, never a bare error toast. Shared by the manual-entry and
// reconcile drawers — both hit the same upsert() guard.
export function confirmOverwrite(presentation: ApiErrorPresentation, onConfirm: () => void): void {
  Modal.confirm({
    title: 'Timpa data yang ada?',
    content: presentation.title,
    okText: 'Timpa',
    cancelText: 'Batal',
    onOk: onConfirm,
  });
}
