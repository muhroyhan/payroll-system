import { Role } from '@payroll-system/shared-types';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: Role;
}
