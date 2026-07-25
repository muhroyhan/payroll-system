import type { ReactNode } from 'react';
import { Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { QueryStateGuard } from './QueryStateGuard';

interface ListPageProps<T extends object> {
  title: string;
  /** e.g. a "Tambah" button opening a FormDrawer. */
  primaryAction?: ReactNode;
  /** Filter bar content, rendered above the table. */
  filters?: ReactNode;
  query: {
    data: T[] | undefined;
    isLoading: boolean;
    isError: boolean;
    error: unknown;
    refetch: () => void;
  };
  columns: ColumnsType<T>;
  rowKey: string | ((record: T) => string);
  emptyDescription?: string;
}

// §15.0 (08_FRONTEND_STRUCTURE.md) — the List archetype: filter bar + table +
// primary action, client-side pagination (§14 R-08, no list endpoint is
// paginated server-side yet) and the shared loading/empty/error states via
// QueryStateGuard. Feature screens supply columns + the query; they do not
// re-implement this shell.
export function ListPage<T extends object>({
  title,
  primaryAction,
  filters,
  query,
  columns,
  rowKey,
  emptyDescription,
}: ListPageProps<T>) {
  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <Typography.Title level={4} style={{ margin: 0 }}>
          {title}
        </Typography.Title>
        {primaryAction}
      </div>
      {filters && <div style={{ marginBottom: 16 }}>{filters}</div>}
      <QueryStateGuard
        query={query}
        isEmpty={(data) => data.length === 0}
        emptyDescription={emptyDescription}
      >
        {(data) => (
          <Table<T>
            rowKey={rowKey}
            columns={columns}
            dataSource={data}
            pagination={{ pageSize: 20, showSizeChanger: true }}
          />
        )}
      </QueryStateGuard>
    </div>
  );
}
