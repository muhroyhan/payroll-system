import { createBrowserRouter } from 'react-router-dom';
import { HomePage } from '../pages/HomePage';
import { ForbiddenPage } from '../pages/ForbiddenPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { LoginPage } from '../features/auth/LoginPage';
import { EmployeeListPage } from '../features/employees/EmployeeListPage';
import { EmployeeDetailPage } from '../features/employees/EmployeeDetailPage';
import { EmployeeImportPage } from '../features/employees/EmployeeImportPage';
import { OrganizationPage } from '../features/organization/OrganizationPage';
import { SalaryMasterPage } from '../features/salary-master/SalaryMasterPage';
import { IncentiveMasterPage } from '../features/incentive-master/IncentiveMasterPage';
import { HolidaysPage } from '../features/holidays/HolidaysPage';
import { LeaveTypesPage } from '../features/leave/leave-types/LeaveTypesPage';
import { LeavePolicyMasterPage } from '../features/leave/leave-policy-master/LeavePolicyMasterPage';
import { LeaveBalancesPage } from '../features/leave/leave-balances/LeaveBalancesPage';
import { LeaveRequestListPage } from '../features/leave/leave-requests/LeaveRequestListPage';
import { LeaveRequestDetailPage } from '../features/leave/leave-requests/LeaveRequestDetailPage';
import { FingerprintsPage } from '../features/fingerprints/FingerprintsPage';
import { RawLogsPage } from '../features/attendance/raw-logs/RawLogsPage';
import { AttendanceRecordsPage } from '../features/attendance/records/AttendanceRecordsPage';
import { ProtectedLayout } from './ProtectedLayout';

// FE-T01/T03/T04 (09_FRONTEND_STEPS.md) — /login, /403, and * are public
// (no ProtectedLayout, no role check). Every other route nests under
// ProtectedLayout, which enforces auth + the role guard from access.ts
// (R-11, 07_FRONTEND_RULES.md) before rendering its <Outlet/>. Feature
// tasks add one child route each; nothing here changes shape as they land.
//
// "/employees/import" is listed before "/employees/:id" — react-router
// matches route order, and a param route would otherwise swallow it.
export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/403', element: <ForbiddenPage /> },
  {
    element: <ProtectedLayout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/employees', element: <EmployeeListPage /> },
      { path: '/employees/import', element: <EmployeeImportPage /> },
      { path: '/employees/:id', element: <EmployeeDetailPage /> },
      { path: '/organization', element: <OrganizationPage /> },
      { path: '/masters/salary', element: <SalaryMasterPage /> },
      { path: '/masters/incentive', element: <IncentiveMasterPage /> },
      { path: '/masters/holidays', element: <HolidaysPage /> },
      { path: '/leave/types', element: <LeaveTypesPage /> },
      { path: '/leave/policy', element: <LeavePolicyMasterPage /> },
      { path: '/leave/balances', element: <LeaveBalancesPage /> },
      { path: '/leave/requests', element: <LeaveRequestListPage /> },
      { path: '/leave/requests/:id', element: <LeaveRequestDetailPage /> },
      { path: '/attendance/fingerprints', element: <FingerprintsPage /> },
      { path: '/attendance/raw-logs', element: <RawLogsPage /> },
      { path: '/attendance/records', element: <AttendanceRecordsPage /> },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
]);
