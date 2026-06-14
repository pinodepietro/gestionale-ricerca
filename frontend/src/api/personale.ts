// frontend/src/api/personale.ts
import { apiClient } from './client';
import type { ApiResponse, PaginatedResponse } from '../types/api';
import type { Persona, CostoOrarioPersona, MonteOreAnnuale, Allocazione } from '../types/personale';

export const personaleApi = {
  list: (params: { attivo?: boolean; search?: string; ruolo?: string; page_size?: number } = {}) =>
    apiClient.get<PaginatedResponse<Persona>>('/persone', { params }),

  get: (id: string) =>
    apiClient.get<ApiResponse<Persona>>(`/persone/${id}`),

  create: (data: Partial<Persona>) =>
    apiClient.post<ApiResponse<Persona>>('/persone', data),

  delete: (id: string) =>
    apiClient.delete<ApiResponse<{ deleted: boolean }>>(`/persone/${id}`),

  update: (id: string, data: Partial<Persona>) =>
    apiClient.patch<ApiResponse<Persona>>(`/persone/${id}`, data),

  costiOrari: {
    list: (personaId: string) =>
      apiClient.get<ApiResponse<CostoOrarioPersona[]>>(`/persone/${personaId}/costi-orari`),
    create: (personaId: string, data: Partial<CostoOrarioPersona>) =>
      apiClient.post<ApiResponse<CostoOrarioPersona>>(`/persone/${personaId}/costi-orari`, data),
  },

  monteOre: {
    list: (personaId: string) =>
      apiClient.get<ApiResponse<MonteOreAnnuale[]>>(`/persone/${personaId}/monte-ore`),
    getAnno: (personaId: string, anno: number) =>
      apiClient.get<ApiResponse<MonteOreAnnuale>>(`/persone/${personaId}/monte-ore/${anno}`),
    upsert: (personaId: string, anno: number, data: { ore_disponibili: number }) =>
      apiClient.put<ApiResponse<MonteOreAnnuale>>(`/persone/${personaId}/monte-ore/${anno}`, data),
  },

  allocazioni: {
    list: (progettoId: string) =>
      apiClient.get<ApiResponse<Allocazione[]>>(`/progetti/${progettoId}/allocazioni`),
    create: (progettoId: string, data: Partial<Allocazione>) =>
      apiClient.post<ApiResponse<Allocazione>>(`/progetti/${progettoId}/allocazioni`, data),
    update: (id: string, data: Partial<Allocazione>) =>
      apiClient.patch<ApiResponse<Allocazione>>(`/allocazioni/${id}`, data),
    delete: (id: string) =>
      apiClient.delete(`/allocazioni/${id}`),
  },
};
