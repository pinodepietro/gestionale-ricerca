// frontend/src/api/sal.ts
import { apiClient } from './client';
import type { ApiResponse, PaginatedResponse, JobStatus } from '../types/api';
import type { Sal } from '../types/budget';
import type { ExportSalRequest } from '../types/timesheet';

export const salApi = {
  list: (progettoId: string) =>
    apiClient.get<PaginatedResponse<Sal>>('/sal', { params: { progetto_id: progettoId } }),

  get: (id: string) =>
    apiClient.get<ApiResponse<Sal>>(`/sal/${id}`),

  create: (data: Partial<Sal>) =>
    apiClient.post<ApiResponse<Sal>>('/sal', data),

  update: (id: string, data: Partial<Sal>) =>
    apiClient.patch<ApiResponse<Sal>>(`/sal/${id}`, data),

  // Transizioni di stato
  chiudi: (id: string) =>
    apiClient.post<ApiResponse<Sal>>(`/sal/${id}/chiudi`),

  invia: (id: string) =>
    apiClient.post<ApiResponse<Sal>>(`/sal/${id}/invia`),

  contesta: (id: string, motivo: string) =>
    apiClient.post<ApiResponse<Sal>>(`/sal/${id}/contesta`, { motivo_contestazione: motivo }),

  delete: (id: string) =>
    apiClient.delete<{ data: { deleted: boolean } }>(`/sal/${id}`),

  getDettaglio: (id: string) =>
    apiClient.get<{ data: unknown }>(`/sal/${id}/dettaglio`),

  associaVoci: (id: string, payload: { spese_ids: string[]; timesheet_ids: string[] }) =>
    apiClient.post<{ data: unknown }>(`/sal/${id}/associa-voci`, payload),

  rendiconta: (id: string) =>
    apiClient.post<ApiResponse<Sal>>(`/sal/${id}/rendiconta`),

  registraErogazione: (id: string, data: { importo_erogato: number; data_erogazione: string }) =>
    apiClient.post<ApiResponse<Sal>>(`/sal/${id}/registra-erogazione`, data),

  // Export asincrono
  avviaExport: (id: string, payload: ExportSalRequest) =>
    apiClient.post<ApiResponse<JobStatus>>(`/sal/${id}/export`, payload),

  getJobStatus: (jobId: string) =>
    apiClient.get<ApiResponse<JobStatus>>(`/export/jobs/${jobId}`),
};
