import type { Role } from '@payroll-system/shared-types';
import { apiClient } from '../../api/client';

// Mirrors user.entity.ts (passwordHash excluded server-side, per
// users.service.ts's list()/findById()). Admin-only
// (@Roles(Role.ADMIN) at the class level — verified against
// users.controller.ts).
//
// ⚠️ There is NO PUT/PATCH/DELETE on /users at all — only GET (list) and
// POST (create). No edit, no deactivate, no password reset via the API,
// even though `isActive` exists on the entity and gates login
// (AuthService.validateUser). Build no UI for lifecycle actions that don't
// exist; this screen is list + create only.
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
