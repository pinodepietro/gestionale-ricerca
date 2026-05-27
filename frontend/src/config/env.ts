// frontend/src/config/env.ts

export const env = {
  apiUrl: import.meta.env.VITE_API_URL ?? 'http://localhost:8000',
  missioniUrl: import.meta.env.VITE_MISSIONI_URL ?? 'http://localhost:8001',
} as const;
