import { apiClient } from './client';
import type { ApiResponse, PaginatedResponse } from '../types/api';

export interface RimborsoSpesaRiga {
  id: string;
  descrizione: string;
  data: string;
  importo: number;
  ha_documento: boolean;
  documento_nome?: string;
}

export interface RimborsoSpesa {
  id: string;
  richiesta_autorizzazione_spesa_id: string;
  amministrativo_id?: string;
  pi_id?: string;
  direttore_dipartimento_id?: string;
  autorizzazione: {
    tipo: 'progetto' | 'fondi_individuali';
    oggetto: string;
    importo: number;
    progetto_id?: string;
    progetto_titolo?: string;
    dipartimento_id: string;
    dipartimento_nome?: string;
    impegno_id?: string;
  };
  richiedente_id: string;
  richiedente_nome?: string;
  stato: string;
  note?: string;
  motivazione_rigetto?: string;
  righe: RimborsoSpesaRiga[];
  totale_righe: number;
  warning_capienza: boolean;
  delta_importo: number;
  spesa_id?: string;
  ha_pdf: boolean;
  data_invio?: string;
  data_approvazione_rs?: string;
  data_approvazione_dir_dip?: string;
  data_approvazione_dg?: string;
  created_at: string;
  updated_at: string;
}

export interface AutorizzazioneDisponibile {
  id: string;
  tipo: 'progetto' | 'fondi_individuali';
  oggetto: string;
  importo: number;
  progetto_titolo?: string;
  data_approvazione_dg?: string;
}

export const rimborsiSpesaApi = {
  list: (params: { stato?: string; solo_miei?: boolean; page?: number; page_size?: number } = {}) =>
    apiClient.get<PaginatedResponse<RimborsoSpesa>>('/rimborsi-spesa', { params }),

  get: (id: string) =>
    apiClient.get<ApiResponse<RimborsoSpesa>>(`/rimborsi-spesa/${id}`),

  autorizzazioniDisponibili: () =>
    apiClient.get<ApiResponse<AutorizzazioneDisponibile[]>>('/rimborsi-spesa/autorizzazioni-disponibili'),

  create: (richiesta_autorizzazione_spesa_id: string, note?: string) =>
    apiClient.post<ApiResponse<RimborsoSpesa>>('/rimborsi-spesa', { richiesta_autorizzazione_spesa_id, note }),

  update: (id: string, data: { note?: string }) =>
    apiClient.patch<ApiResponse<RimborsoSpesa>>(`/rimborsi-spesa/${id}`, data),

  delete: (id: string) =>
    apiClient.delete<ApiResponse<{ deleted: boolean }>>(`/rimborsi-spesa/${id}`),

  // Righe
  creaRiga: (id: string, data: { descrizione: string; data: string; importo: number }) =>
    apiClient.post<ApiResponse<RimborsoSpesa>>(`/rimborsi-spesa/${id}/righe`, data),

  aggiornaRiga: (rigaId: string, data: { descrizione?: string; data?: string; importo?: number }) =>
    apiClient.put<ApiResponse<RimborsoSpesa>>(`/rimborsi-spesa/righe/${rigaId}`, data),

  eliminaRiga: (rigaId: string) =>
    apiClient.delete<ApiResponse<RimborsoSpesa>>(`/rimborsi-spesa/righe/${rigaId}`),

  uploadDocumentoRiga: (rigaId: string, file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return apiClient.post(`/rimborsi-spesa/righe/${rigaId}/documento`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },

  // Transizioni workflow
  invia: (id: string) => apiClient.post<ApiResponse<RimborsoSpesa>>(`/rimborsi-spesa/${id}/invia`),
  approvaAmmin: (id: string) => apiClient.post<ApiResponse<RimborsoSpesa>>(`/rimborsi-spesa/${id}/approva-ammin`),
  approvaRs: (id: string) => apiClient.post<ApiResponse<RimborsoSpesa>>(`/rimborsi-spesa/${id}/approva-rs`),
  approvaDirDip: (id: string) => apiClient.post<ApiResponse<RimborsoSpesa>>(`/rimborsi-spesa/${id}/approva-dir-dip`),
  approvaDg: (id: string) => apiClient.post<ApiResponse<RimborsoSpesa>>(`/rimborsi-spesa/${id}/approva-dg`),
  rigetta: (id: string, motivazione: string) =>
    apiClient.post<ApiResponse<RimborsoSpesa>>(`/rimborsi-spesa/${id}/rigetta`, { motivazione }),
  riapri: (id: string) => apiClient.post<ApiResponse<RimborsoSpesa>>(`/rimborsi-spesa/${id}/riapri`),
};
