import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, UserRole, CommunityRegisterPayload, isCommunityUserRole } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<User>;
  register: (name: string, email: string, pass: string, role: string, org?: string) => Promise<User>;
  registerCommunity: (payload: CommunityRegisterPayload) => Promise<User>;
  logout: () => void;
  hasRole: (roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('bluecarbon_token'));
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('bluecarbon_token');
      if (storedToken) {
        try {
          const userData = await api.getMe();
          setUser(userData);
          setToken(storedToken);
        } catch (err) {
          console.warn('Session expired or invalid, logging out', err);
          logout();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, pass: string): Promise<User> => {
    setLoading(true);
    try {
      const data = await api.login(email, pass);
      localStorage.setItem('bluecarbon_token', data.access_token);
      setToken(data.access_token);
      setUser(data.user);
      return data.user;
    } finally {
      setLoading(false);
    }
  };

  const register = async (name: string, email: string, pass: string, role: string, org?: string): Promise<User> => {
    setLoading(true);
    try {
      await api.register(name, email, pass, role, org);
      // Auto-login after registration
      return await login(email, pass);
    } finally {
      setLoading(false);
    }
  };

  const registerCommunity = async (payload: CommunityRegisterPayload): Promise<User> => {
    setLoading(true);
    try {
      await api.registerCommunity(payload);
      // Auto-login after registration
      return await login(payload.email, payload.password);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('bluecarbon_token');
    sessionStorage.clear();
    setToken(null);
    setUser(null);
  };

  const hasRole = (roles: UserRole[]): boolean => {
    if (!user) return false;
    if (user.role === 'Admin') return true; // Admin has super-access
    return roles.some(r => r === user.role || (isCommunityUserRole(r) && isCommunityUserRole(user.role)));
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, registerCommunity, logout, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
