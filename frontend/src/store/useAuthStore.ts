// frontend/src/store/useAuthStore.ts
import { create } from 'zustand';
import type { User } from '../types/auth';

function salvaUser(user: User) {
  localStorage.setItem('user', JSON.stringify(user));
}
function caricaUser(): User | null {
  try {
    const raw = localStorage.getItem('user');
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: caricaUser(),
  token: localStorage.getItem('access_token'),
  isAuthenticated: !!localStorage.getItem('access_token'),

  login: (user, token) => {
    localStorage.setItem('access_token', token);
    salvaUser(user);
    set({ user, token, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    set({ user: null, token: null, isAuthenticated: false });
  },

  setUser: (user) => {
    salvaUser(user);
    set({ user });
  },
}));
