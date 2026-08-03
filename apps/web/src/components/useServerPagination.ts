import { useState } from 'react';
import type { PaginationParams } from '../api/pagination';

// BUGS#2 — the one page/limit state a server-paginated ListPage needs;
// every migrated list screen composes this instead of hand-rolling
// current/pageSize state + an onChange handler per page.
export function useServerPagination(initialLimit = 20) {
  const [params, setParams] = useState<PaginationParams>({ page: 1, limit: initialLimit });

  const onChange = (page: number, pageSize: number) => {
    setParams((prev) => ({ ...prev, page, limit: pageSize }));
  };

  // Call when a filter changes — a new filter's result set doesn't
  // necessarily have a page 2, so staying on it would show an empty table.
  const resetToFirstPage = () => setParams((prev) => (prev.page === 1 ? prev : { ...prev, page: 1 }));

  return { params, onChange, resetToFirstPage };
}
