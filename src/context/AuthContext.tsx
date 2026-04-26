import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
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
const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;
const LAST_ACTIVITY_KEY = 'rentx_last_activity';

function loadUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem('rentx_user');
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
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
      localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
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

  const logout = useCallback(() => {
    clearToken();
    localStorage.removeItem(LAST_ACTIVITY_KEY);
    disconnectSocket();
    setUser(null);
  }, []);

  const logoutForInactivity = useCallback(() => {
    logout();
    navigate('/login', { replace: true });
  }, [logout, navigate]);

  useEffect(() => {
    if (!user) return undefined;

    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let lastWrite = 0;

    const markActivity = () => {
      const now = Date.now();
      if (now - lastWrite > 1000) {
        localStorage.setItem(LAST_ACTIVITY_KEY, String(now));
        lastWrite = now;
      }
    };

    const scheduleLogout = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(logoutForInactivity, INACTIVITY_TIMEOUT_MS);
    };

    const handleActivity = () => {
      markActivity();
      scheduleLogout();
    };

    const checkElapsedTime = () => {
      const lastActivity = Number(localStorage.getItem(LAST_ACTIVITY_KEY) || Date.now());
      if (Date.now() - lastActivity >= INACTIVITY_TIMEOUT_MS) {
        logoutForInactivity();
        return;
      }
      scheduleLogout();
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'rentx_token' && !event.newValue) logoutForInactivity();
      if (event.key === LAST_ACTIVITY_KEY) checkElapsedTime();
    };

    markActivity();
    scheduleLogout();

    const events: Array<keyof WindowEventMap> = ['click', 'keydown', 'mousemove', 'scroll', 'touchstart', 'focus'];
    events.forEach(event => window.addEventListener(event, handleActivity, { passive: true }));
    document.addEventListener('visibilitychange', checkElapsedTime);
    window.addEventListener('storage', handleStorage);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      events.forEach(event => window.removeEventListener(event, handleActivity));
      document.removeEventListener('visibilitychange', checkElapsedTime);
      window.removeEventListener('storage', handleStorage);
    };
  }, [logoutForInactivity, user]);

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
