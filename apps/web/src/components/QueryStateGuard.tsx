import type { ReactNode } from 'react';
import { Button, Empty, Result, Spin } from 'antd';
import { describeApiError } from '../api/errors';

interface QueryLike<T> {
  data: T | undefined;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => void;
}

interface QueryStateGuardProps<T> {
  query: QueryLike<T>;
  children: (data: T) => ReactNode;
  isEmpty?: (data: T) => boolean;
  emptyDescription?: string;
  loadingLabel?: string;
}

// FE-T05 (09_FRONTEND_STEPS.md) — the one place a React Query result becomes
// UI. Every list/detail screen composes this (directly or via ListPage /
// DetailPage) instead of hand-rolling loading/empty/error per screen, and
// every error path goes through describeApiError() — no raw error string
// ever reaches a component (R-04, 07_FRONTEND_RULES.md).
export function QueryStateGuard<T>({
  query,
  children,
  isEmpty,
  emptyDescription = 'Tidak ada data.',
  loadingLabel,
}: QueryStateGuardProps<T>) {
  if (query.isLoading) {
    // antd's `tip` only renders with nested content (or fullscreen) — skip
    // it entirely when no label is given, to avoid the console warning most
    // call sites would otherwise trigger for no visible benefit.
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
        {loadingLabel ? (
          <Spin tip={loadingLabel} size="large">
            <div style={{ minWidth: 200, minHeight: 40 }} />
          </Spin>
        ) : (
          <Spin size="large" />
        )}
      </div>
    );
  }

  if (query.isError) {
    const presentation = describeApiError(query.error);
    return (
      <Result
        status={presentation.kind === 'notfound' ? '404' : 'error'}
        title={presentation.title}
        subTitle={presentation.detail}
        extra={
          <Button type="primary" onClick={() => query.refetch()}>
            Coba Lagi
          </Button>
        }
      />
    );
  }

  if (query.data === undefined) {
    return null;
  }

  if (isEmpty?.(query.data)) {
    return <Empty description={emptyDescription} />;
  }

  return <>{children(query.data)}</>;
}
