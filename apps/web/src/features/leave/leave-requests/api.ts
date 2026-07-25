import type { LeaveRequestStatus } from '@payroll-system/shared-types';
import { apiClient } from '../../../api/client';

// Mirrors leave-request.entity.ts. list() includes ['leaveType'] but NOT
// employee; findByIdOrThrow() (the detail GET) includes NEITHER association
// at all (verified against leave-requests.service.ts — plain findByPk with
// no `include`). Names are looked up from useEmployeesQuery/useLeaveTypesQuery
// on both list and detail, not a second lookup implementation.
//
// ⚠️ No endpoint exposes a requested-day count as a field. The backend
// computes one internally (countWeekdaysInclusive in
// leave-requests.service.ts) only to check it against the balance during
// approve() — it surfaces solely inside that 409's message text, never as
// queryable data. The frontend does not recompute it (R-07/R-10) and does
// not display an invented number; see LeaveRequestDetailPage.tsx.
export interface LeaveRequest {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  leaveType?: { id: string; name: string };
  startDate: string;
  endDate: string;
  status: LeaveRequestStatus;
  approvedBy: string | null;
}

export interface LeaveRequestFormValues {
  employeeId: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
}

export async function listLeaveRequests(employeeId?: string): Promise<LeaveRequest[]> {
  const { data } = await apiClient.get<LeaveRequest[]>('/leave-requests', {
    params: { employeeId },
  });
  return data;
}

export async function getLeaveRequest(id: string): Promise<LeaveRequest> {
  const { data } = await apiClient.get<LeaveRequest>(`/leave-requests/${id}`);
  return data;
}

export async function createLeaveRequest(
  input: LeaveRequestFormValues,
): Promise<LeaveRequest> {
  const { data } = await apiClient.post<LeaveRequest>('/leave-requests', input);
  return data;
}

export async function updateLeaveRequest(
  id: string,
  input: Partial<LeaveRequestFormValues>,
): Promise<LeaveRequest> {
  const { data } = await apiClient.put<LeaveRequest>(`/leave-requests/${id}`, input);
  return data;
}

export async function removeLeaveRequest(id: string): Promise<void> {
  await apiClient.delete(`/leave-requests/${id}`);
}

export async function approveLeaveRequest(id: string): Promise<LeaveRequest> {
  const { data } = await apiClient.put<LeaveRequest>(`/leave-requests/${id}/approve`);
  return data;
}

export async function rejectLeaveRequest(id: string): Promise<LeaveRequest> {
  const { data } = await apiClient.put<LeaveRequest>(`/leave-requests/${id}/reject`);
  return data;
}
