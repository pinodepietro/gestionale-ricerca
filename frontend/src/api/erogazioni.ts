import { apiClient } from './client';
import type { ApiResponse } from '../types/api';

export interface Erogazione {
  id: string;
  progetto_id: string;
  importo: number;
  data_erogazione: string;
  tipo: string;
  descrizione?: string;
  ha_documento: boolean;
  documento_path?: string;
  created_by?: string;
  created_at: string;
}

export interface ErogazioniResponse {
  data: Erogazione[];
  totali: {
    totale_erogato: number;
    importo_finanziato: number;
    da_ricevere: number;
  };
}

export const erogazioniApi = {
  list: (progettoId: string) =>
    apiClient.get<ErogazioniResponse>(`/progetti/${progettoId}/erogazioni`),

  create: (progettoId: string, formData: FormData) =>
    apiClient.post<ApiResponse<Erogazione>>(`/progetti/${progettoId}/erogazioni`, formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }),

  update: (progettoId: string, id: string, formData: FormData) =>
    apiClient.patch<ApiResponse<Erogazione>>(`/progetti/${progettoId}/erogazioni/${id}`, formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }),

  delete: (progettoId: string, id: string) =>
    apiClient.delete<ApiResponse<{ deleted: boolean }>>(`/progetti/${progettoId}/erogazioni/${id}`),

  documentoUrl: (progettoId: string, id: string) =>
    `/api/v1/progetti/${progettoId}/erogazioni/${id}/documento`,
};
