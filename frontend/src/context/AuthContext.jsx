import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('nutri_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(null); // null = unknown, true/false after check

  useEffect(() => {
    async function init() {
      // 1. Check if the instance needs initial admin setup
      try {
        const status = await api.getSetupStatus();
        setNeedsSetup(status.needs_setup);
      } catch {
        // If the endpoint fails, assume setup is done (older backend)
        setNeedsSetup(false);
      }

      // 2. Validate existing token if present
      const token = localStorage.getItem('nutri_token');
      if (token) {
        try {
          const u = await api.getMe();
          setUser(u);
          localStorage.setItem('nutri_user', JSON.stringify(u));
        } catch {
          localStorage.removeItem('nutri_token');
          localStorage.removeItem('nutri_user');
          setUser(null);
        }
      }

      setLoading(false);
    }

    init();
  }, []);

  const login = async (username, password) => {
    const res = await api.login({ username, password });
    localStorage.setItem('nutri_token', res.access_token);
    localStorage.setItem('nutri_user', JSON.stringify(res.user));
    setUser(res.user);
    return res.user;
  };

  const setupAdmin = async (username, email, password) => {
    const res = await api.setupAdmin({ username, email: email || undefined, password });
    localStorage.setItem('nutri_token', res.access_token);
    localStorage.setItem('nutri_user', JSON.stringify(res.user));
    setUser(res.user);
    setNeedsSetup(false);
    return res.user;
  };

  const logout = () => {
    localStorage.removeItem('nutri_token');
    localStorage.removeItem('nutri_user');
    setUser(null);
  };

  const loginWithToken = (token, userData) => {
    localStorage.setItem('nutri_token', token);
    localStorage.setItem('nutri_user', JSON.stringify(userData));
    setUser(userData);
  };

  const refreshUser = async () => {
    const u = await api.getMe();
    setUser(u);
    localStorage.setItem('nutri_user', JSON.stringify(u));
  };

  return (
    <AuthContext.Provider value={{ user, loading, needsSetup, login, loginWithToken, setupAdmin, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
