import React, { createContext, useContext, useEffect, useState } from 'react';
import { getToken } from './authService';

// Lightweight JWT decoder for browser (does not verify signature).
function decodeJwt<T = any>(token: string): T | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const payload = parts[1];
    // Decode base64url
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    // Pad base64 string
    const pad = base64.length % 4;
    const padded = base64 + (pad ? '='.repeat(4 - pad) : '');
    const decoded = atob(padded);
    return JSON.parse(decoded) as T;
  } catch (e) {
    console.error('Failed to decode JWT', e);
    return null;
  }
}

type User = {
  id: string;
  role: 'admin' | 'official' | 'citizen';
  username: string;
  fullName?: string;
  mobileNumber?: string;
  email?: string;
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  refreshUser: () => void;
  setUserPublic: (u: User | null) => void;
};

const AuthContext = createContext<AuthContextType>({ user: null, loading: true, refreshUser: () => {}, setUserPublic: () => {} });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (token) {
      const decoded = decodeJwt<User>(token);
      // If the token doesn't include a fullName, try to read a persisted value from localStorage
      const storedName = (() => {
        try { return localStorage.getItem('auth_user_fullName') || undefined; } catch (e) { return undefined; }
      })();
      if (decoded) {
        if (!decoded.fullName && storedName) decoded.fullName = storedName;
        setUser(decoded);
      } else console.warn('Invalid or unsupported token format');
    }
    setLoading(false);
  }, []);

  function refreshUser() {
    setLoading(true);
    const token = getToken();
    if (token) {
      const decoded = decodeJwt<User>(token);
      const storedName = (() => {
        try { return localStorage.getItem('auth_user_fullName') || undefined; } catch (e) { return undefined; }
      })();
      if (decoded) {
        if (!decoded.fullName && storedName) decoded.fullName = storedName;
        setUser(decoded);
      } else setUser(null);
    } else {
      setUser(null);
    }
    setLoading(false);
  }

  function setUserPublic(u: User | null) {
    setUser(u);
    // persist fullName for future token-based decodes if available
    try {
      if (u?.fullName) localStorage.setItem('auth_user_fullName', u.fullName);
      else localStorage.removeItem('auth_user_fullName');
    } catch (e) {}
  }

  return (
    <AuthContext.Provider value={{ user, loading, refreshUser, setUserPublic }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);