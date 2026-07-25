import { createContext } from 'react';
import type { SessionUser } from '../../api/session';

export interface AuthContextValue {
  user: SessionUser | null;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
