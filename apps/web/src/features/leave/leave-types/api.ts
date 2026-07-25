import { apiClient } from '../../../api/client';

// Mirrors apps/api/src/modules/leave/leave-types/entities/leave-type.entity.ts
// — a plain {id, name} lookup, full CRUD, A+H. Not effective-dated (unlike
// leave-policy-master).
export interface LeaveType {
  id: string;
  name: string;
}

export interface LeaveTypeFormValues {
  name: string;
}

export async function listLeaveTypes(): Promise<LeaveType[]> {
  const { data } = await apiClient.get<LeaveType[]>('/leave-types');
  return data;
}

export async function createLeaveType(input: LeaveTypeFormValues): Promise<LeaveType> {
  const { data } = await apiClient.post<LeaveType>('/leave-types', input);
  return data;
}

export async function updateLeaveType(
  id: string,
  input: LeaveTypeFormValues,
): Promise<LeaveType> {
  const { data } = await apiClient.put<LeaveType>(`/leave-types/${id}`, input);
  return data;
}

export async function removeLeaveType(id: string): Promise<void> {
  await apiClient.delete(`/leave-types/${id}`);
}
