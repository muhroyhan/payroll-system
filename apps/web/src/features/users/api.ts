import type { Role } from '@payroll-system/shared-types';
import { apiClient } from '../../api/client';

// Mirrors user.entity.ts (passwordHash excluded server-side, per
// users.service.ts's list()/findById()). Admin-only
// (@Roles(Role.ADMIN) at the class level — verified against
// users.controller.ts).
//
// There is still no generic PUT/PATCH/DELETE on /users — no edit, no
// password reset via the API — but PATCH :id/deactivate and :id/reactivate
// (USER-005) are dedicated lifecycle routes, same convention as this
// codebase's other state-transition endpoints (payroll-runs' approve/
// disburse/revert, kasbon's approve/reject).
export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
}

export interface CreateUserFormValues {
  name: string;
  email: string;
  password: string;
  role: Role;
}

export async function listUsers(): Promise<AppUser[]> {
  const { data } = await apiClient.get<AppUser[]>('/users');
  return data;
}

export async function createUser(input: CreateUserFormValues): Promise<AppUser> {
  const { data } = await apiClient.post<AppUser>('/users', input);
  return data;
}

export async function deactivateUser(id: string): Promise<AppUser> {
  const { data } = await apiClient.patch<AppUser>(`/users/${id}/deactivate`);
  return data;
}

export async function reactivateUser(id: string): Promise<AppUser> {
  const { data } = await apiClient.patch<AppUser>(`/users/${id}/reactivate`);
  return data;
}
