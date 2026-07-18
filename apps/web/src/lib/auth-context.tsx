'use client';

import type { AuthResponse } from '@todoapp/shared';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { refreshSession } from './auth-api';

type User = AuthResponse['user'];

interface AuthState {
  user: User | null;
  loading: boolean;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Access token lives only in memory, so it's gone after a reload — recover the
    // session from the httpOnly refresh cookie instead (Architecture §7.2).
    refreshSession()
      .then((data) => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  return <AuthContext.Provider value={{ user, loading, setUser }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
