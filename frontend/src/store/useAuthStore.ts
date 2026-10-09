// frontend/src/store/useAuthStore.ts
import { create } from 'zustand';
import type { User } from '../types/auth';

// Fallback memory storage se localStorage non disponibile
let memoryStorage: Record<string, string> = {};

function salvaUser(user: User) {
  try {
    localStorage.setItem('user', JSON.stringify(user));
  } catch (e) {
    if (e instanceof Error && e.name === 'QuotaExceededError') {
      console.warn('Storage quota exceeded, using memory fallback');
      memoryStorage['user'] = JSON.stringify(user);
    } else if (e instanceof Error && e.name === 'SecurityError') {
      console.warn('localStorage disabled, using memory fallback');
      memoryStorage['user'] = JSON.stringify(user);
    } else {
      throw e;
    }
  }
}

function caricaUser(): User | null {
  try {
    const raw = localStorage.getItem('user') || memoryStorage['user'];
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

function salvaToken(token: string) {
  try {
    localStorage.setItem('access_token', token);
  } catch (e) {
    if (e instanceof Error && (e.name === 'QuotaExceededError' || e.name === 'SecurityError')) {
      console.warn('localStorage unavailable, using memory fallback');
      memoryStorage['access_token'] = token;
    } else {
      throw e;
    }
  }
}

function caricaToken(): string | null {
  try {
    return localStorage.getItem('access_token') || memoryStorage['access_token'] || null;
  } catch {
    return memoryStorage['access_token'] || null;
  }
}

function rimuoviToken() {
  try {
    localStorage.removeItem('access_token');
  } catch (e) {
    console.warn('Error removing token from localStorage', e);
  }
  delete memoryStorage['access_token'];
}

function rimuoviUser() {
  try {
    localStorage.removeItem('user');
  } catch (e) {
    console.warn('Error removing user from localStorage', e);
  }
  delete memoryStorage['user'];
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>((set) => {
  // Setup multi-tab sync: ascolta storage events da altri tab
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (e) => {
      if (e.key === 'access_token') {
        set({ token: e.newValue || null, isAuthenticated: !!e.newValue });
      } else if (e.key === 'user') {
        try {
          const user = e.newValue ? (JSON.parse(e.newValue) as User) : null;
          set({ user });
        } catch {
          set({ user: null });
        }
      }
    });
  }

  return {
    user: caricaUser(),
    token: caricaToken(),
    isAuthenticated: !!caricaToken(),

    login: (user, token) => {
      salvaToken(token);
      salvaUser(user);
      set({ user, token, isAuthenticated: true });
    },

    logout: () => {
      rimuoviToken();
      rimuoviUser();
      set({ user: null, token: null, isAuthenticated: false });
    },

    setUser: (user) => {
      salvaUser(user);
      set({ user });
    },
  };
});
