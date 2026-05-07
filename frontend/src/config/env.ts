// frontend/src/config/env.ts

export const env = {
  apiUrl: import.meta.env.VITE_API_URL ?? 'http://localhost:8000',
} as const;
