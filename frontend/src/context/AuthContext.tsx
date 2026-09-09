import React, { createContext, useContext, useState, useEffect } from 'react';
import { request, setAuthToken, removeAuthToken, getAuthToken } from '../services/api';

export interface UserSession {
  userId: string;
  name: string;
  role: 'ADMIN' | 'RECEPTION' | 'DOCTOR' | 'NURSE' | 'WARD_STAFF' | 'DIAGNOSTICS' | 'PHARMACY' | 'BILLING' | 'PATIENT';
  labType?: string;
  token: string;
}

interface AuthContextType {
  user: UserSession | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<UserSession>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      const token = getAuthToken();
      const savedUserStr = localStorage.getItem('user');

      if (token && savedUserStr) {
        try {
          const savedUser = JSON.parse(savedUserStr);
          setUser({ ...savedUser, token });
          
          // Verify with backend
          const freshData = await request('/auth/me');
          if (freshData) {
            const updatedUser: UserSession = {
              userId: freshData.username,
              name: freshData.name,
              role: freshData.role,
              labType: freshData.labType || 'ALL',
              token,
            };
            setUser(updatedUser);
            localStorage.setItem('user', JSON.stringify(updatedUser));
          }
        } catch (error) {
          console.warn('Auth validation failed. Logging out...', error);
          logout();
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (username: string, password: string): Promise<UserSession> => {
    setLoading(true);
    try {
      const res = await request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });

      const session: UserSession = {
        userId: res.userId,
        name: res.name,
        role: res.role,
        labType: res.labType || 'ALL',
        token: res.token,
      };

      setAuthToken(res.token);
      localStorage.setItem('user', JSON.stringify(session));
      setUser(session);
      return session;
    } catch (error) {
      setLoading(false);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    removeAuthToken();
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const token = getAuthToken();
      if (!token) return;
      const freshData = await request('/auth/me');
      if (freshData) {
        const updatedUser: UserSession = {
          userId: freshData.username,
          name: freshData.name,
          role: freshData.role,
          labType: freshData.labType || 'ALL',
          token,
        };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
