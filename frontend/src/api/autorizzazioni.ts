import { apiClient } from './client';
import type { ApiResponse, PaginatedResponse } from '../types/api';

export interface Dipartimento {
  id: string;
  nome: string;
  direttore_id?: string;
  direttore?: { id: string; nome: string; cognome: string };
}

export interface AutorizzazioneSpesa {
  id: string;
  amministrativo_id?: string;
  pi_id?: string;
  direttore_dipartimento_id?: string;
  tipo: 'progetto' | 'fondi_individuali';
  progetto_id?: string;
  progetto_titolo?: string;
  progetto_cup?: string;
  dipartimento_id: string;
  dipartimento_nome?: string;
  richiedente_id: string;
  richiedente_nome?: string;
  qualita_richiedente: string;
  tipo_contratto: string;
  qualita_progetto?: string;
  macrocategoria: string;
  voce_lettera: string;
  voce_altro?: string;
  oggetto: string;
  descrizione: string;
  importo: number;
  durata_da?: string;
  durata_a?: string;
  termini_pagamento?: string;
  anticipazione_spesa: boolean;
  ha_allegato_g: boolean;
  ha_allegato_preventivo: boolean;
  budget_voce_id?: string;
  budget_voce_codice?: string;
  budget_voce_descrizione?: string;
  stato: string;
  motivazione_rigetto?: string;
  impegno_id?: string;
  ha_pdf: boolean;
  created_at: string;
  updated_at: string;
}

export interface BudgetVoceDisponibile {
  id: string;
  voce_id: string;
  codice?: string;
  descrizione?: string;
  importo_previsto: number;
  importo_impegnato: number;
  disponibile: number;
  importo_richiesto: number;
  sufficiente: boolean;
}

export const dipartimentiApi = {
  list: () => apiClient.get<ApiResponse<Dipartimento[]>>('/dipartimenti'),
  create: (data: Partial<Dipartimento>) => apiClient.post<ApiResponse<Dipartimento>>('/dipartimenti', data),
  update: (id: string, data: Partial<Dipartimento>) => apiClient.patch<ApiResponse<Dipartimento>>(`/dipartimenti/${id}`, data),
  delete: (id: string) => apiClient.delete<ApiResponse<{ deleted: boolean }>>(`/dipartimenti/${id}`),
};

export const autorizzazioniApi = {
  list: (params: { stato?: string; progetto_id?: string; solo_mie?: boolean; page?: number; page_size?: number } = {}) =>
    apiClient.get<PaginatedResponse<AutorizzazioneSpesa>>('/autorizzazioni-spesa', { params }),

  get: (id: string) =>
    apiClient.get<ApiResponse<AutorizzazioneSpesa>>(`/autorizzazioni-spesa/${id}`),

  create: (data: Partial<AutorizzazioneSpesa>) =>
    apiClient.post<ApiResponse<AutorizzazioneSpesa>>('/autorizzazioni-spesa', data),

  update: (id: string, data: Partial<AutorizzazioneSpesa>) =>
    apiClient.patch<ApiResponse<AutorizzazioneSpesa>>(`/autorizzazioni-spesa/${id}`, data),

  delete: (id: string) =>
    apiClient.delete<ApiResponse<{ deleted: boolean }>>(`/autorizzazioni-spesa/${id}`),

  uploadAllegatoG: (id: string, file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return apiClient.post(`/autorizzazioni-spesa/${id}/allegato-g`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },

  uploadPreventivo: (id: string, file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return apiClient.post(`/autorizzazioni-spesa/${id}/allegato-preventivo`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },

  budgetVociDisponibili: (id: string) =>
    apiClient.get<ApiResponse<BudgetVoceDisponibile[]>>(`/autorizzazioni-spesa/${id}/budget-voci-disponibili`),

  // Transizioni workflow
  invia: (id: string) => apiClient.post<ApiResponse<AutorizzazioneSpesa>>(`/autorizzazioni-spesa/${id}/invia`),
  approvaAmmin: (id: string, budget_voce_id: string) =>
    apiClient.post<ApiResponse<AutorizzazioneSpesa>>(`/autorizzazioni-spesa/${id}/approva-ammin`, { budget_voce_id }),
  approvaRs: (id: string) => apiClient.post<ApiResponse<AutorizzazioneSpesa>>(`/autorizzazioni-spesa/${id}/approva-rs`),
  approvaDirDip: (id: string) => apiClient.post<ApiResponse<AutorizzazioneSpesa>>(`/autorizzazioni-spesa/${id}/approva-dir-dip`),
  approvaDg: (id: string) => apiClient.post<ApiResponse<AutorizzazioneSpesa>>(`/autorizzazioni-spesa/${id}/approva-dg`),
  rigetta: (id: string, motivazione: string) =>
    apiClient.post<ApiResponse<AutorizzazioneSpesa>>(`/autorizzazioni-spesa/${id}/rigetta`, { motivazione }),
  riapri: (id: string) => apiClient.post<ApiResponse<AutorizzazioneSpesa>>(`/autorizzazioni-spesa/${id}/riapri`),
};
