import { apiClient } from '../../../api/client';

// Mirrors leave-balance.entity.ts. list() includes ['leaveType'] (verified
// against leave-balances.service.ts) but NOT employee — the page looks the
// employee name up via useEmployeesQuery instead of a second lookup.
export interface LeaveBalance {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  leaveType?: { id: string; name: string };
  year: number;
  quota: number;
  used: number;
  manuallyAdjusted: boolean;
}

// Mirrors ResolveLeaveBalanceRowResult (leave-balances.service.ts) — the
// bulk year-start seeding's per-employee outcome.
export interface ResolveLeaveBalanceRowResult {
  employeeId: string;
  ok: boolean;
  balanceId?: string;
  message?: string;
}

export async function listLeaveBalances(
  employeeId?: string,
  year?: number,
): Promise<LeaveBalance[]> {
  const { data } = await apiClient.get<LeaveBalance[]>('/leave-balances', {
    params: { employeeId, year },
  });
  return data;
}

export async function resolveOneLeaveBalance(input: {
  employeeId: string;
  leaveTypeId: string;
  year: number;
}): Promise<LeaveBalance> {
  const { data } = await apiClient.post<LeaveBalance>('/leave-balances/resolve', input);
  return data;
}

// Bulk year-start initialization across every active employee (§5.4).
export async function resolveLeaveBalancesForLeaveType(input: {
  leaveTypeId: string;
  year: number;
}): Promise<ResolveLeaveBalanceRowResult[]> {
  const { data } = await apiClient.post<ResolveLeaveBalanceRowResult[]>(
    '/leave-balances/resolve-for-leave-type',
    input,
  );
  return data;
}

// Only `quota` is editable through this route (§11) — `used` only ever moves
// via the leave_requests approval workflow, never a direct edit. `reason` is
// mandatory server-side (UpdateLeaveBalanceQuotaDto, min 5 chars) — LEAVEBAL-004/006.
export async function updateLeaveBalanceQuota(
  id: string,
  quota: number,
  reason: string,
): Promise<LeaveBalance> {
  const { data } = await apiClient.put<LeaveBalance>(`/leave-balances/${id}/quota`, {
    quota,
    reason,
  });
  return data;
}
