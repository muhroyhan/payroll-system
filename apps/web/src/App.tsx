import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider } from 'antd';
import { RouterProvider } from 'react-router-dom';
import { router } from './routes/router';

// FE-T01 (09_FRONTEND_STEPS.md §13.2) — one QueryClient, app-wide (R-01,
// 07_FRONTEND_RULES.md: server state lives in React Query, nothing else).
// Created once at module scope, not per-render.
const queryClient = new QueryClient();

// ConfigProvider theme tokens are the only global theming layer (§13.1/R-03) —
// brand tokens land here once a design decision exists; empty object keeps
// antd's defaults until then.
const theme = {};

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider theme={theme}>
        <RouterProvider router={router} />
      </ConfigProvider>
    </QueryClientProvider>
  );
}
