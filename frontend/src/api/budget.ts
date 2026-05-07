// frontend/src/api/budget.ts
import { apiClient } from './client';
import type { ApiResponse, PaginatedResponse } from '../types/api';
import type { BudgetVoce, Spesa } from '../types/budget';

export const budgetApi = {
  voci: {
    list: (progettoId: string) =>
      apiClient.get<ApiResponse<BudgetVoce[]>>(`/progetti/${progettoId}/budget`),
    update: (id: string, data: Partial<BudgetVoce>) =>
      apiClient.patch<ApiResponse<BudgetVoce>>(`/budget/${id}`, data),
  },

  spese: {
    list: (progettoId: string, params: { sal_id?: string; voce_id?: string; page?: number } = {}) =>
      apiClient.get<PaginatedResponse<Spesa>>(`/progetti/${progettoId}/spese`, { params }),

    get: (id: string) =>
      apiClient.get<ApiResponse<Spesa>>(`/spese/${id}`),

    create: (progettoId: string, data: Partial<Spesa>) =>
      apiClient.post<ApiResponse<Spesa>>(`/progetti/${progettoId}/spese`, data),

    // Rettifica: crea nota di credito (importo negativo) collegata alla spesa originale
    rettifica: (progettoId: string, spesaOrigineId: string, data: Partial<Spesa>) =>
      apiClient.post<ApiResponse<Spesa>>(`/progetti/${progettoId}/spese`, {
        ...data,
        spesa_origine_id: spesaOrigineId,
      }),

    annulla: (id: string) =>
      apiClient.post<ApiResponse<Spesa>>(`/progetti/spese/${id}/annulla`),

    uploadAllegato: (id: string, formData: FormData) =>
      apiClient.post<ApiResponse<{ allegato_path: string }>>(`/spese/${id}/allegato`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }),
  },
};
