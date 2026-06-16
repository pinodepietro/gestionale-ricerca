import { apiClient } from './client';
import type { ApiResponse, PaginatedResponse } from '../types/api';

export interface StepApprovazioneMissione {
  id: string;
  ruolo: string;
  decisione: string;
  approvatore_nome: string;
  luogo_firma?: string;
  note?: string;
  ciclo: number;
  decided_at?: string;
}

export interface AllegatoMissione {
  id: string;
  tipo: string;
  file_nome_originale?: string;
  caricato_da_nome: string;
  created_at?: string;
}

export interface RigaRimborsoMissione {
  id: string;
  data_inizio?: string;
  data_fine?: string;
  attivita: string;
  importo?: number;
  ha_documento: boolean;
  documento_nome?: string;
}

export interface MissioneDisponibile {
  id: string;
  titolo: string;
  destinazione: string;
  data_inizio?: string;
  data_fine?: string;
  approvata_il?: string;
  progetto_titolo?: string;
}

export interface RimborsoMissione {
  id: string;
  missione_id: string;
  missione_titolo?: string;
  richiedente_id: string;
  richiedente_nome: string;
  pi_id?: string;
  ammin_id?: string;
  dir_dip_id?: string;
  importo_stimato_missione?: number;
  voce_impegno_missione?: string;
  voce_descrizione?: string;
  disponibilita_voce?: number;
  stato: string;
  note?: string;
  ciclo: number;
  ha_scheda_finanziaria: boolean;
  ha_pdf: boolean;
  totale: number;
  righe: RigaRimborsoMissione[];
  step_approvazione: StepApprovazioneMissione[];
  allegati: AllegatoMissione[];
  inviata_il?: string;
  approvata_il?: string;
  respinta_il?: string;
  created_at?: string;
}

export interface Missione {
  id: string;
  titolo: string;
  destinazione: string;
  motivo: string;
  data_inizio?: string;
  data_fine?: string;
  ora_inizio?: string;
  ora_fine?: string;
  stato: string;
  progetto_id: string;
  progetto_titolo?: string;
  progetto_codice?: string;
  richiedente_id: string;
  richiedente_nome: string;
  gruppo_missione?: string | null;
  copertura_tipo: string;
  copertura_descrizione?: string;
  mezzo_tipo: string;
  mezzo_descrizione?: string;
  auto_alimentazione?: string;
  auto_cilindrata?: string;
  motivazione_mezzo_straordinario?: string;
  importo_stimato?: number;
  voce_impegno?: string;
  impegno_gestionale_id?: string;
  luogo_approvazione?: string;
  note_approvazione?: string;
  ha_pdf: boolean;
  pi_id?: string;
  pi_nome?: string;
  ammin_id?: string;
  dir_dip_id?: string;
  dg_id?: string;
  step_approvazione: StepApprovazioneMissione[];
  allegati: AllegatoMissione[];
  rimborso?: RimborsoMissione;
  inviata_il?: string;
  approvata_il?: string;
  respinta_il?: string;
  created_at?: string;
  updated_at?: string;
}

export interface QualificaMissione {
  id: string;
  gruppo: string;
  codice: string;
  nome: string;
  attiva: boolean;
}

export const missioniApi = {
  list: (params: { stato?: string; progetto_id?: string; solo_mie?: boolean; page?: number; page_size?: number } = {}) =>
    apiClient.get<PaginatedResponse<Missione>>('/missioni', { params }),

  get: (id: string) =>
    apiClient.get<ApiResponse<Missione>>(`/missioni/${id}`),

  create: (data: Partial<Missione>) =>
    apiClient.post<ApiResponse<Missione>>('/missioni', data),

  update: (id: string, data: Partial<Missione>) =>
    apiClient.patch<ApiResponse<Missione>>(`/missioni/${id}`, data),

  delete: (id: string) =>
    apiClient.delete<ApiResponse<{ deleted: boolean }>>(`/missioni/${id}`),

  // Workflow
  invia: (id: string) =>
    apiClient.post<ApiResponse<Missione>>(`/missioni/${id}/invia`),

  approva: (id: string, data: { luogo?: string; note?: string }) =>
    apiClient.post<ApiResponse<Missione>>(`/missioni/${id}/approva`, data),

  rigetta: (id: string, motivazione: string) =>
    apiClient.post<ApiResponse<Missione>>(`/missioni/${id}/rigetta`, { motivazione }),

  riapri: (id: string) =>
    apiClient.post<ApiResponse<Missione>>(`/missioni/${id}/riapri`),

  // Allegati
  uploadAllegato: (id: string, file: File, tipo = 'richiesta') => {
    const fd = new FormData();
    fd.append('file', file);
    return apiClient.post<ApiResponse<Missione>>(`/missioni/${id}/allegati?tipo=${tipo}`, fd,
      { headers: { 'Content-Type': 'multipart/form-data' } });
  },

  eliminaAllegato: (allegatoId: string) =>
    apiClient.delete<ApiResponse<{ deleted: boolean }>>(`/missioni/allegati/${allegatoId}`),

  // Rimborso
  creaRimborso: (missioneId: string, note?: string) =>
    apiClient.post<ApiResponse<Missione>>(`/missioni/${missioneId}/rimborso`, { note }),
};

export const rimborsiMissioneApi = {
  list: (params: { stato?: string; solo_miei?: boolean; page?: number; page_size?: number } = {}) =>
    apiClient.get<PaginatedResponse<RimborsoMissione>>('/rimborsi-missione', { params }),

  missioniDisponibili: () =>
    apiClient.get<ApiResponse<MissioneDisponibile[]>>('/rimborsi-missione/missioni-disponibili'),

  get: (id: string) =>
    apiClient.get<ApiResponse<RimborsoMissione>>(`/rimborsi-missione/${id}`),

  update: (id: string, data: { note?: string }) =>
    apiClient.patch<ApiResponse<RimborsoMissione>>(`/rimborsi-missione/${id}`, data),

  // Righe
  creaRiga: (id: string, data: { data_inizio: string; data_fine: string; attivita: string; importo?: number }) =>
    apiClient.post<ApiResponse<RimborsoMissione>>(`/rimborsi-missione/${id}/righe`, data),

  aggiornaRiga: (rigaId: string, data: { data_inizio?: string; data_fine?: string; attivita?: string; importo?: number }) =>
    apiClient.put<ApiResponse<RimborsoMissione>>(`/rimborsi-missione/righe/${rigaId}`, data),

  eliminaRiga: (rigaId: string) =>
    apiClient.delete<ApiResponse<RimborsoMissione>>(`/rimborsi-missione/righe/${rigaId}`),

  uploadDocumentoRiga: (rigaId: string, file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return apiClient.post(`/rimborsi-missione/righe/${rigaId}/documento`, fd,
      { headers: { 'Content-Type': 'multipart/form-data' } });
  },

  uploadSchedaFinanziaria: (id: string, file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return apiClient.post(`/rimborsi-missione/${id}/scheda-finanziaria`, fd,
      { headers: { 'Content-Type': 'multipart/form-data' } });
  },

  uploadAllegato: (id: string, file: File, tipo = 'rimborso') => {
    const fd = new FormData();
    fd.append('file', file);
    return apiClient.post<ApiResponse<RimborsoMissione>>(`/rimborsi-missione/${id}/allegati?tipo=${tipo}`, fd,
      { headers: { 'Content-Type': 'multipart/form-data' } });
  },

  // Workflow
  invia: (id: string) =>
    apiClient.post<ApiResponse<RimborsoMissione>>(`/rimborsi-missione/${id}/invia`),

  approva: (id: string, data: { luogo?: string; note?: string }) =>
    apiClient.post<ApiResponse<RimborsoMissione>>(`/rimborsi-missione/${id}/approva`, data),

  rigetta: (id: string, motivazione: string) =>
    apiClient.post<ApiResponse<RimborsoMissione>>(`/rimborsi-missione/${id}/rigetta`, { motivazione }),

  riapri: (id: string) =>
    apiClient.post<ApiResponse<RimborsoMissione>>(`/rimborsi-missione/${id}/riapri`),
};
