import { apiClient } from './client';
import type { ApiResponse, PaginatedResponse } from '../types/api';
import type { Progetto, DocumentoProgetto, CruscottoProgetto } from '../types/progetto';

export interface ProgettoFilters {
  stato?: string; tipo?: string; anno?: number;
  search?: string; page?: number; page_size?: number;
}

export const progettiApi = {
  list: (filters: ProgettoFilters = {}) =>
    apiClient.get<PaginatedResponse<Progetto>>('/progetti', { params: filters }),
  listBozze: () =>
    apiClient.get<ApiResponse<Progetto[]>>('/progetti/bozze'),
  get: (id: string) =>
    apiClient.get<ApiResponse<Progetto>>(`/progetti/${id}`),
  create: (data: Partial<Progetto>) =>
    apiClient.post<ApiResponse<Progetto>>('/progetti', data),
  update: (id: string, data: Partial<Progetto>) =>
    apiClient.patch<ApiResponse<Progetto>>(`/progetti/${id}`, data),
  delete: (id: string) =>
    apiClient.delete<{ data: { deleted: boolean } }>(`/progetti/${id}`),

  attiva: (id: string) =>
    apiClient.post<ApiResponse<Progetto>>(`/progetti/${id}/attiva`),
  chiudi: (id: string) =>
    apiClient.post<ApiResponse<Progetto>>(`/progetti/${id}/chiudi`),
  cruscotto: (id: string) =>
    apiClient.get<ApiResponse<CruscottoProgetto>>(`/progetti/${id}/cruscotto`),

  documenti: {
    list: (progettoId: string) =>
      apiClient.get<ApiResponse<DocumentoProgetto[]>>(`/progetti/${progettoId}/documenti`),
    upload: (progettoId: string, formData: FormData) =>
      apiClient.post<ApiResponse<DocumentoProgetto>>(`/progetti/${progettoId}/documenti`, formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }),
  },

  partner: {
    list: (progettoId: string) =>
      apiClient.get<ApiResponse<unknown[]>>(`/progetti/${progettoId}/partner`),
    add: (progettoId: string, data: { partner_id: string; ruolo: string }) =>
      apiClient.post<ApiResponse<unknown>>(`/progetti/${progettoId}/partner`, data),
    remove: (progettoId: string, ppId: string) =>
      apiClient.delete<ApiResponse<unknown>>(`/progetti/${progettoId}/partner/${ppId}`),
  },

  budget: {
    list: (progettoId: string) =>
      apiClient.get<ApiResponse<unknown[]>>(`/progetti/${progettoId}/budget`),
    salva: (progettoId: string, voci: { voce_id: string; importo_previsto: number }[]) =>
      apiClient.post<ApiResponse<unknown>>(`/progetti/${progettoId}/budget`, { voci }),
  },

  wp: {
    list: (progettoId: string) =>
      apiClient.get<ApiResponse<unknown[]>>(`/progetti/${progettoId}/wp`),
    create: (progettoId: string, data: Record<string, unknown>) =>
      apiClient.post<ApiResponse<unknown>>(`/progetti/${progettoId}/wp`, data),
    update: (wpId: string, data: Record<string, unknown>) =>
      apiClient.patch<ApiResponse<unknown>>(`/wp/${wpId}`, data),
    delete: (wpId: string) =>
      apiClient.delete<ApiResponse<unknown>>(`/wp/${wpId}`),
  },

  allocazioni: {
    list: (progettoId: string) =>
      apiClient.get<ApiResponse<unknown[]>>(`/progetti/${progettoId}/allocazioni`),
    create: (progettoId: string, data: Record<string, unknown>) =>
      apiClient.post<ApiResponse<unknown>>(`/progetti/${progettoId}/allocazioni`, data),
    update: (progettoId: string, allocId: string, data: Record<string, unknown>) =>
      apiClient.patch<ApiResponse<unknown>>(`/progetti/${progettoId}/allocazioni/${allocId}`, data),
    delete: (progettoId: string, allocId: string) =>
      apiClient.delete<ApiResponse<unknown>>(`/progetti/${progettoId}/allocazioni/${allocId}`),
  },
};
