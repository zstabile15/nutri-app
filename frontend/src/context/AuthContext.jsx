import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('nutri_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('nutri_token');
    if (token) {
      api.getMe()
        .then(u => {
          setUser(u);
          localStorage.setItem('nutri_user', JSON.stringify(u));
        })
        .catch(() => {
          localStorage.removeItem('nutri_token');
          localStorage.removeItem('nutri_user');
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (username, password) => {
    const res = await api.login({ username, password });
    localStorage.setItem('nutri_token', res.access_token);
    localStorage.setItem('nutri_user', JSON.stringify(res.user));
    setUser(res.user);
    return res.user;
  };

  const register = async (username, email, password) => {
    const res = await api.register({ username, email, password });
    localStorage.setItem('nutri_token', res.access_token);
    localStorage.setItem('nutri_user', JSON.stringify(res.user));
    setUser(res.user);
    return res.user;
  };

  const logout = () => {
    localStorage.removeItem('nutri_token');
    localStorage.removeItem('nutri_user');
    setUser(null);
  };

  const refreshUser = async () => {
    const u = await api.getMe();
    setUser(u);
    localStorage.setItem('nutri_user', JSON.stringify(u));
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
