import type { ReactNode } from 'react';
import { Card, Space, Tabs, Typography, type TabsProps } from 'antd';
import { Link } from 'react-router-dom';
import { QueryStateGuard } from './QueryStateGuard';

interface DetailPageProps<T> {
  title: string;
  query: {
    data: T | undefined;
    isLoading: boolean;
    isError: boolean;
    error: unknown;
    refetch: () => void;
  };
  /** antd Descriptions (or any record summary) for the loaded record. */
  renderSummary: (data: T) => ReactNode;
  tabs?: TabsProps['items'];
  /** Action bar — build each button with <LockedAction> per R-06. */
  actions?: ReactNode;
  /** Link back to the list screen. */
  backTo?: string;
}

// §15.0 (08_FRONTEND_STRUCTURE.md) — the Detail archetype: a record summary
// (antd Descriptions) + Tabs for related collections + an action bar whose
// buttons obey R-06 (locked before the click, not discovered after a 409).
export function DetailPage<T>({
  title,
  query,
  renderSummary,
  tabs,
  actions,
  backTo,
}: DetailPageProps<T>) {
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
        <Space>
          {backTo && <Link to={backTo}>&larr; Kembali</Link>}
          <Typography.Title level={4} style={{ margin: 0 }}>
            {title}
          </Typography.Title>
        </Space>
        {actions && <Space>{actions}</Space>}
      </div>
      <QueryStateGuard query={query}>
        {(data) => (
          <>
            <Card style={{ marginBottom: tabs ? 16 : 0 }}>
              {renderSummary(data)}
            </Card>
            {tabs && <Tabs items={tabs} />}
          </>
        )}
      </QueryStateGuard>
    </div>
  );
}
