import { createBrowserRouter } from 'react-router-dom';
import { HomePage } from '../pages/HomePage';
import { ForbiddenPage } from '../pages/ForbiddenPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { LoginPage } from '../features/auth/LoginPage';
import { ProtectedLayout } from './ProtectedLayout';

// FE-T01/T03/T04 (09_FRONTEND_STEPS.md) — /login, /403, and * are public
// (no ProtectedLayout, no role check). Every other route nests under
// ProtectedLayout, which enforces auth + the role guard from access.ts
// (R-11, 07_FRONTEND_RULES.md) before rendering its <Outlet/>. Feature
// tasks add one child route each; nothing here changes shape as they land.
export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/403', element: <ForbiddenPage /> },
  {
    element: <ProtectedLayout />,
    children: [{ path: '/', element: <HomePage /> }],
  },
  { path: '*', element: <NotFoundPage /> },
]);
