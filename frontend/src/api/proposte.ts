import { apiClient } from './client';
import type { ApiResponse, PaginatedResponse } from '../types/api';
import type { Proposta, PropostaPartner } from '../types/proposta';

export const proposteApi = {
  list: (params: { stato?: string; search?: string; page?: number; page_size?: number } = {}) =>
    apiClient.get<PaginatedResponse<Proposta>>('/proposte', { params }),

  get: (id: string) =>
    apiClient.get<ApiResponse<Proposta>>(`/proposte/${id}`),

  create: (data: Partial<Proposta>) =>
    apiClient.post<ApiResponse<Proposta>>('/proposte', data),

  update: (id: string, data: Partial<Proposta>) =>
    apiClient.patch<ApiResponse<Proposta>>(`/proposte/${id}`, data),

  delete: (id: string) =>
    apiClient.delete<ApiResponse<{ deleted: boolean }>>(`/proposte/${id}`),

  aggiungiPartner: (propostaId: string, data: Partial<PropostaPartner>) =>
    apiClient.post<ApiResponse<PropostaPartner>>(`/proposte/${propostaId}/partner`, data),

  aggiornaPartner: (propostaId: string, partnerId: string, data: Partial<PropostaPartner>) =>
    apiClient.patch<ApiResponse<PropostaPartner>>(`/proposte/${propostaId}/partner/${partnerId}`, data),

  eliminaPartner: (propostaId: string, partnerId: string) =>
    apiClient.delete<ApiResponse<{ deleted: boolean }>>(`/proposte/${propostaId}/partner/${partnerId}`),

  converti: (id: string, data: { codice: string; tipo: string; data_fine?: string }) =>
    apiClient.post<ApiResponse<{ progetto_id: string; codice: string; titolo: string; stato: string }>>(
      `/proposte/${id}/converti`, data
    ),
};
