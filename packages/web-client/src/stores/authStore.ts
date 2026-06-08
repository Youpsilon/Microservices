import { create } from 'zustand';
import api from '../services/api';

interface User {
  id: string;
  email: string;
  name: string;
  roles: string[];
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (data: any) => void;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

const sanitizeRoles = (roles: string[] | any): string[] => {
  if (!roles) return [];
  if (typeof roles === 'string') {
    try {
      const parsed = JSON.parse(roles);
      if (Array.isArray(parsed)) return parsed.map(r => r.replace(/[\[\]"]/g, '').trim());
    } catch {
      return roles.split(',').map(r => r.replace(/[\[\]"]/g, '').trim());
    }
  }
  if (Array.isArray(roles)) {
    return roles.map(r => typeof r === 'string' ? r.replace(/[\[\]"]/g, '').trim() : r);
  }
  return [];
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: !!localStorage.getItem('accessToken'),
  isLoading: true,
  
  login: (data) => {
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    const sanitizedUser = data.user ? {
      ...data.user,
      roles: sanitizeRoles(data.user.roles)
    } : null;
    set({ user: sanitizedUser, isAuthenticated: true, isLoading: false });
  },
  
  logout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    set({ user: null, isAuthenticated: false });
    window.location.href = '/login';
  },
  
  checkAuth: async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) throw new Error('No token');
      
      const res = await api.get('/users/me');
      const user = res.data;
      if (user) {
        user.roles = sanitizeRoles(user.roles);
      }
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (err) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  }
}));
