// frontend/src/api/client.ts
import axios, { type AxiosError } from 'axios';
import { env } from '../config/env';
import type { ApiError } from '../types/api';

export const apiClient = axios.create({
  baseURL: `${env.apiUrl}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
});

type NotifyFn = (type: 'error' | 'warning', message: string, description?: string) => void;
let _notify: NotifyFn | null = null;

export function setNotifyCallback(fn: NotifyFn) {
  _notify = fn;
}

function notify(type: 'error' | 'warning', message: string, description?: string) {
  if (_notify) _notify(type, message, description);
}

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiError>) => {
    const code = error.response?.data?.detail?.error?.code ?? error.response?.data?.error?.code;
    const status = error.response?.status;

    if (status === 401) {
      localStorage.removeItem('access_token');
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login?reason=session_expired';
      }
      return Promise.reject(error);
    }

    if (status === 403 && code === 'RBAC_AZIONE_NON_CONSENTITA') {
      notify('error', 'Operazione non consentita', 'Non hai i permessi per eseguire questa azione.');
      return Promise.reject(error);
    }

    if (status === 403 && code === 'RBAC_RISORSA_NON_DI_COMPETENZA') {
      notify('warning', 'Risorsa non accessibile');
      return Promise.reject(error);
    }

    if (status === 409) {
      notify('warning', error.response?.data?.error?.message ?? 'Operazione non consentita nello stato attuale');
      return Promise.reject(error);
    }

    if (status === 500) {
      notify('error', 'Errore del server', 'Si è verificato un errore imprevisto. Riprova tra qualche istante.');
      return Promise.reject(error);
    }

    return Promise.reject(error);
  },
);
