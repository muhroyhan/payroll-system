import type { ReactNode } from 'react';
import { Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { QueryStateGuard } from './QueryStateGuard';

/** Drives antd Table's pagination from a server-paginated query instead of
 *  antd slicing an already-fully-fetched array client-side (BUGS#2). Omit
 *  this prop entirely to keep the old client-side-pagination behavior —
 *  every not-yet-migrated screen still works unchanged. */
export interface ServerPaginationProps {
  current: number;
  pageSize: number;
  total: number;
  onChange: (page: number, pageSize: number) => void;
}

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
  /** Server-side pagination (BUGS#2). Omitted -> client-side pagination
   *  over `query.data` (the pre-migration default, §14 R-08). */
  pagination?: ServerPaginationProps;
}

// §15.0 (08_FRONTEND_STRUCTURE.md) — the List archetype: filter bar + table +
// primary action, the shared loading/empty/error states via QueryStateGuard,
// and (since BUGS#2) either server- or client-side pagination depending on
// whether the caller supplies `pagination`. Feature screens supply columns +
// the query; they do not re-implement this shell.
export function ListPage<T extends object>({
  title,
  primaryAction,
  filters,
  query,
  columns,
  rowKey,
  emptyDescription,
  pagination,
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
            pagination={
              pagination
                ? {
                    current: pagination.current,
                    pageSize: pagination.pageSize,
                    total: pagination.total,
                    showSizeChanger: true,
                    onChange: pagination.onChange,
                  }
                : { pageSize: 20, showSizeChanger: true }
            }
          />
        )}
      </QueryStateGuard>
    </div>
  );
}
