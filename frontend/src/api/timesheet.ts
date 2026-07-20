// frontend/src/api/timesheet.ts
import { apiClient } from './client';
import type { ApiResponse, PaginatedResponse, JobStatus } from '../types/api';
import type { TimesheetTestata, TimesheetRighePayload, ExportTimesheetRequest } from '../types/timesheet';

export interface TimesheetFilters {
  persona_id?: string;
  progetto_id?: string;
  anno?: number;
  mese?: number;
  stato?: string;
  page?: number;
  page_size?: number;
}

export const timesheetApi = {
  list: (filters: TimesheetFilters = {}) =>
    apiClient.get<PaginatedResponse<TimesheetTestata>>('/timesheet', { params: filters }),

  get: (id: string) =>
    apiClient.get<ApiResponse<TimesheetTestata>>(`/timesheet/${id}`),

  create: (data: Partial<TimesheetTestata>) =>
    apiClient.post<ApiResponse<TimesheetTestata>>('/timesheet', data),

  // PUT — sostituzione completa di tutte le righe e celle
  aggiornaRighe: (id: string, payload: TimesheetRighePayload) =>
    apiClient.put<ApiResponse<{ id: string; righe_count: number; ore_totali: number }>>(`/timesheet/${id}/righe`, payload),

  // Transizioni di stato
  invia: (id: string) =>
    apiClient.post<ApiResponse<TimesheetTestata>>(`/timesheet/${id}/invia`),

  approva: (id: string) =>
    apiClient.post<ApiResponse<TimesheetTestata>>(`/timesheet/${id}/approva`),

  approvaFinale: (id: string) =>
    apiClient.post<ApiResponse<TimesheetTestata>>(`/timesheet/${id}/approva-finale`),

  rifiuta: (id: string, note: string) =>
    apiClient.post<ApiResponse<TimesheetTestata>>(`/timesheet/${id}/rifiuta`, { note }),

  delete: (id: string) =>
    apiClient.delete<{ data: { deleted: boolean } }>(`/timesheet/${id}`),

  // Export — sincrono (file più leggeri rispetto al SAL)
  export: (id: string, payload: ExportTimesheetRequest) =>
    apiClient.post<ApiResponse<JobStatus>>(`/timesheet/${id}/export`, payload),
};
