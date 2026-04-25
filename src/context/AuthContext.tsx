import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { AuthUser, LocationData } from '../types';
import { api, setToken, clearToken } from '../lib/api';
import { disconnectSocket } from '../lib/socket';

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  updateUser: (updates: Partial<AuthUser>) => void;
  login: (email: string, password: string) => Promise<boolean>;
  register: (payload: {
    name: string;
    username: string;
    email: string;
    password: string;
    phone: string;
    location: LocationData;
  }) => Promise<{ ok: boolean; error?: string }>;
  sendOtp: (email: string) => Promise<{ ok: boolean; error?: string }>;
  verifyOTP: (email: string, otp: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

function loadUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem('rentx_user');
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(loadUser);

  // Keep localStorage in sync
  useEffect(() => {
    if (user) localStorage.setItem('rentx_user', JSON.stringify(user));
    else localStorage.removeItem('rentx_user');
  }, [user]);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const res = await api.auth.login(email, password) as {
        data: { token: string; user: { userId: string; name: string; username: string; email: string; phone: string; location: LocationData; avatar?: string; createdAt: string } };
      };
      setToken(res.data.token);
      setUser({
        id: res.data.user.userId,
        name: res.data.user.name,
        username: res.data.user.username,
        email: res.data.user.email,
        phone: res.data.user.phone,
        location: res.data.user.location,
        createdAt: res.data.user.createdAt,
        avatar: res.data.user.avatar || '',
      });
      return true;
    } catch {
      return false;
    }
  };

  const register = async (payload: {
    name: string;
    username: string;
    email: string;
    password: string;
    phone: string;
    location: LocationData;
  }): Promise<{ ok: boolean; error?: string }> => {
    try {
      await api.auth.register(payload);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  };

  const sendOtp = async (email: string): Promise<{ ok: boolean; error?: string }> => {
    try {
      await api.auth.verifyEmail(email);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  };

  const verifyOTP = async (email: string, otp: string): Promise<{ ok: boolean; error?: string }> => {
    try {
      await api.auth.confirmOtp(email, otp);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  };

  const logout = () => {
    clearToken();
    disconnectSocket();
    setUser(null);
  };

  const updateUser = (updates: Partial<AuthUser>) => {
    setUser(current => current ? { ...current, ...updates } : current);
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      updateUser,
      login,
      register,
      sendOtp,
      verifyOTP,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
